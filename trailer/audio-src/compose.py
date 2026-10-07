# Makes the trailer's own sound, all from code (like Sandlot itself): the score, the bat crack and the crowd.
# Run: ../.tools/bin/python audio-src/compose.py   (writes assets/audio/*.wav)
import numpy as np, wave, os

SR = 48000
LEN = 30.0
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def band(x, lo, hi):
    """Band-pass by masking the spectrum (soft edges)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def conv(x, ir):
    n = len(x) + len(ir) - 1
    N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]


def reverb_ir(sec=2.4, decay=3.2, bright=6000):
    t = t_axis(sec)
    ir = rng.standard_normal(len(t)) * np.exp(-decay * t)
    ir = band(ir, 120, bright)
    ir[0] = 0
    return ir / np.abs(ir).sum() * 18


IR = reverb_ir()


def place(buf, sound, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(sound), len(buf) - i)
    buf[i:i + n] += sound[:n] * gain


# ---------------------------------------------------------------- instruments
def drum(f0=150, f1=48, dur=1.2, punch=0.6, noise=0.25):
    """Taiko-ish boom: a sine that drops in pitch, plus a short skin slap."""
    t = t_axis(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * (3.2 / dur))
    slap = band(rng.standard_normal(len(t)), 200, 4000) * np.exp(-t * 60) * noise
    click = np.sin(2 * np.pi * 900 * t) * np.exp(-t * 300) * 0.3
    return (body + slap + click * punch) * 0.9


def hat(dur=0.08, g=0.25):
    t = t_axis(dur)
    return band(rng.standard_normal(len(t)), 6000, 14000) * np.exp(-t * 70) * g


def saw(freq, t):
    # band-limited-ish saw: a few harmonics
    y = np.zeros_like(t)
    for k in range(1, 14):
        y += np.sin(2 * np.pi * freq * k * t) / k * (1 - k / 15)
    return y


def stab(freqs, dur=2.6, g=0.22):
    """A brassy chord stab: detuned saws through a closing filter."""
    t = t_axis(dur)
    y = np.zeros_like(t)
    for fr in freqs:
        for d in (-0.12, 0, 0.13):
            y += saw(fr * (1 + d / 100), t)
    env = np.minimum(1, t / 0.02) * np.exp(-t * 1.3)
    y = band(y, 60, 2600) * env
    return y * g / len(freqs)


def pad(freqs, dur, g=0.12, attack=1.5, release=1.5):
    t = t_axis(dur)
    y = np.zeros_like(t)
    for fr in freqs:
        for d in (-0.2, 0.0, 0.21):
            y += saw(fr * (1 + d / 100), t)
    y = band(y, 50, 1400)
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release)
    return y * env * g / len(freqs)


A1, E2, A2, C3, E3, G2, F2 = 55.0, 82.41, 110.0, 130.81, 164.81, 98.0, 87.31
AMIN = [A2, C3, E3]
FMAJ = [F2, 174.61, 220.0]
CMAJ = [C3, 196.0, 261.63]
GMAJ = [G2, 146.83, 196.0]

# ---------------------------------------------------------------- score
n = int(LEN * SR)
dry = np.zeros(n)
t = t_axis(LEN)

# low drone under everything, out for the breath before contact and thinner while you pitch
drone = (np.sin(2 * np.pi * A1 * t) + 0.5 * np.sin(2 * np.pi * E2 * t) + 0.25 * np.sin(2 * np.pi * A2 * t)) * 0.16
denv = np.clip(t / 3.0, 0, 1)
denv *= np.where((t > 7.0) & (t < 7.43), np.clip((7.43 - t) / 0.43, 0, 1) * 0 + 0.0, 1.0)
denv *= np.where((t > 15.0) & (t < 17.0), 0.55, 1.0)
denv *= np.clip((LEN - t) / 1.6, 0, 1)
dry += drone * denv

# 0 - 4.2: the stadium at dusk - two distant booms
place(dry, drum(120, 40, 2.5, 0.2, 0.15), 0.05, 0.9)
place(dry, drum(120, 40, 2.5, 0.2, 0.15), 2.1, 0.7)

# 4.2 - 7.0: the windup - a heartbeat that speeds up, then nothing
for at in [4.2, 4.75, 5.25, 5.65, 6.0, 6.3, 6.55, 6.75, 6.9, 7.0]:
    place(dry, drum(140, 50, 0.9, 0.5, 0.3), at, 0.75)

# 7.43: CONTACT - the big hit
place(dry, drum(180, 38, 3.2, 1.0, 0.6), 7.43, 1.5)
place(dry, stab(AMIN + [A1 * 2], 3.0, 0.5), 7.43)

# 8.9 - 15.0: the flight - a driving rhythm at 120 bpm
beat = 0.5
for i in range(int((15.0 - 8.9) / (beat / 2))):
    at = 8.9 + i * beat / 2
    if i % 2 == 0:
        place(dry, drum(130, 46, 0.8, 0.5, 0.3), at, 0.8 if i % 8 == 0 else 0.55)
    if i % 8 == 6:
        place(dry, drum(220, 110, 0.4, 0.3, 0.5), at, 0.45)
    place(dry, hat(), at, 0.6 if i % 2 else 0.35)
for k, ch in enumerate([AMIN, FMAJ, CMAJ, GMAJ, AMIN, FMAJ]):
    place(dry, stab(ch, 1.0, 0.28), 8.9 + k * 1.0)
place(dry, drum(170, 40, 2.6, 0.8, 0.5), 12.1, 1.1)  # over the wall

# 15.0 - 17.0: you pitch - a ticking clock
for i in range(8):
    place(dry, hat(0.05, 0.4), 15.0 + i * 0.25, 1.0)
place(dry, drum(100, 40, 1.0, 0.2, 0.1), 15.0, 0.6)
# 17.0: strike three
place(dry, drum(180, 38, 3.0, 1.0, 0.6), 17.0, 1.3)
place(dry, stab(FMAJ + [F2 * 2], 2.6, 0.45), 17.0)

# 18.2 - 22.0: the double play - drums back, harder
for i in range(int((22.0 - 18.2) / (beat / 2))):
    at = 18.2 + i * beat / 2
    if i % 2 == 0:
        place(dry, drum(135, 46, 0.8, 0.6, 0.35), at, 0.85 if i % 4 == 0 else 0.6)
    else:
        place(dry, drum(240, 120, 0.3, 0.3, 0.6), at, 0.3)
    place(dry, hat(), at, 0.5)
for k, ch in enumerate([CMAJ, GMAJ, AMIN, GMAJ]):
    place(dry, stab(ch, 0.95, 0.3), 18.2 + k * 0.95)

# 22.0 - 30: the finale - one last hit, a wide chord, the logo hit at 25.6, a long fade
place(dry, drum(180, 38, 3.4, 1.0, 0.6), 22.0, 1.4)
place(dry, pad(FMAJ, 3.6, 0.5, 0.2, 1.0), 22.0)
place(dry, pad(CMAJ + [E3], 4.6, 0.55, 0.6, 2.6), 25.4)
place(dry, drum(190, 36, 4.0, 1.0, 0.6), 25.6, 1.5)
place(dry, stab(CMAJ + [C3 * 2], 3.4, 0.45), 25.6)

wet = conv(dry, IR)
score = dry * 0.8 + wet * 0.45
# a little stereo width: the reverb slightly delayed on one side
d = int(0.012 * SR)
L = score
R = dry * 0.8 + np.concatenate([np.zeros(d), wet[:-d]]) * 0.45


# ---------------------------------------------------------------- bat crack
def crack():
    t = t_axis(1.6)
    snap = rng.standard_normal(len(t)) * np.exp(-t * 900)
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dcy) * a for f, dcy, a in [(1650, 55, 0.9), (2480, 75, 0.6), (3570, 95, 0.4), (820, 40, 0.5)])
    thock = np.sin(2 * np.pi * 380 * t) * np.exp(-t * 45) * 0.7
    y = band(snap, 800, 9000) * 1.4 + ring + thock
    y = y + conv(y, reverb_ir(1.5, 4.5, 7000)) * 0.6
    return y / np.abs(y).max() * 0.95


# ---------------------------------------------------------------- crowd
def crowd(sec, roar_at=None, roar_len=3.5):
    """Thousands of voices: band-limited noise with slow wobble, voice-like formant bands; an optional roar swell."""
    tt = t_axis(sec)
    y = np.zeros(len(tt))
    for lo, hi, g in [(250, 900, 1.0), (700, 1800, 0.8), (1500, 3200, 0.45)]:
        y += band(rng.standard_normal(len(tt)), lo, hi) * g
    wob = band(rng.standard_normal(len(tt)), 0.3, 3) * 3 + 1
    y *= np.clip(wob, 0.4, 1.6)
    env = np.ones(len(tt)) * 0.35
    if roar_at is not None:
        r = (tt - roar_at)
        env += np.where(r > 0, np.minimum(1, r / 0.35) * np.exp(-np.maximum(0, r - 0.6) / roar_len) * 1.4, 0)
    env *= np.minimum(1, tt / 0.6) * np.minimum(1, (sec - tt) / 0.8)
    y *= env
    return y / np.abs(y).max() * 0.9


def write(name, left, right=None):
    right = left if right is None else right
    peak = max(np.abs(left).max(), np.abs(right).max())
    k = 0.89 / peak
    data = np.stack([left * k, right * k], 1)
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote', name, round(len(left) / SR, 2), 's')


write('score.wav', L, R)
write('crack.wav', crack())
cl = crowd(8.0, roar_at=0.15, roar_len=3.0)
write('crowd-roar.wav', cl, np.roll(cl, 900))
cm = crowd(30.0)
write('crowd-bed.wav', cm, np.roll(cm, 1300))
