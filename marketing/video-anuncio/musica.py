"""Trilha do anúncio, toda sintetizada aqui (sem samples nem música de terceiros).

120 BPM, 24 s, no mesmo tempo de anuncio.html: cada corte cai numa batida e
cada efeito (toque, acerto, XP, confete) cai no instante do quadro.
Saída: saida/trilha.wav, já normalizada para -14 LUFS (padrão de Reels/Stories).

    python3 marketing/video-anuncio/musica.py          -> anuncio.html (saida/trilha.wav)
    python3 marketing/video-anuncio/musica.py onibus   -> onibus.html (saida/trilha-onibus.wav)
"""
import os
import subprocess
import sys
import wave

import numpy as np

PAGE = sys.argv[1] if len(sys.argv) > 1 else 'anuncio'
SR = 44100
DUR = 24.0
BEAT = 0.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
mix_l = np.zeros(N)
mix_r = np.zeros(N)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    mix_l[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.4142
    mix_r[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.4142


def hz(note):  # nota MIDI -> Hz
    return 440.0 * 2 ** ((note - 69) / 12)


def env(t, a=0.005, d=0.3):
    return np.minimum(1, t / a) * np.exp(-t / d)


def lowpass(x, k):  # filtro de um polo, k em (0, 1]
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += k * (v - acc)
        y[i] = acc
    return y


# ---------- instrumentos ----------
def kick():
    t = t_axis(0.35)
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 0.16)


def clap():
    t = t_axis(0.25)
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 0.15)
    bursts = sum(np.exp(-np.maximum(t - d, 0) * 60) * (t >= d) for d in (0, 0.012, 0.024))
    return n * (bursts * 0.5 + env(t, 0.03, 0.08)) * 0.5


def hat(open_=False):
    t = t_axis(0.2 if open_ else 0.06)
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 0.5)
    return n * env(t, 0.001, 0.05 if open_ else 0.018) * 0.35


def pluck(note, dur=0.45, bright=1.0):
    t = t_axis(dur)
    f = hz(note)
    s = (np.sin(2 * np.pi * f * t) + 0.5 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t * 8)
         + 0.25 * bright * np.sin(6 * np.pi * f * t) * np.exp(-t * 14))
    return s * env(t, 0.004, 0.18)


def bass(note, dur):
    t = t_axis(dur)
    f = hz(note)
    s = np.tanh(1.6 * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)))
    return s * np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.04) * 0.8


def pad(notes, dur):
    t = t_axis(dur)
    s = sum(np.sin(2 * np.pi * hz(n) * t * (1 + d)) for n in notes for d in (-0.003, 0.003))
    return s / (2 * len(notes)) * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)


def pop(f0=600, f1=1300, dur=0.12):
    t = t_axis(dur)
    f = f0 + (f1 - f0) * (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 0.04)


def whoosh(dur=0.5, up=True):
    t = t_axis(dur)
    n = rng.standard_normal(len(t))
    shape = np.sin(np.pi * t / dur) ** 2
    k = (0.03 + 0.25 * (t / dur if up else 1 - t / dur))
    y = np.empty_like(n)
    acc = 0.0
    for i, v in enumerate(n):
        acc += k[i] * (v - acc)
        y[i] = acc
    return y * shape * 1.2


def ding(notes=(88, 93), dur=0.9):
    t = t_axis(dur)
    s = 0
    for j, n in enumerate(notes):
        tt = np.maximum(t - j * 0.09, 0)
        s = s + (np.sin(2 * np.pi * hz(n) * tt) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.01 * tt)) * env(tt, 0.002, 0.35) * (t >= j * 0.09)
    return s * 0.6


def click():
    t = t_axis(0.03)
    return np.sin(2 * np.pi * 2200 * t) * env(t, 0.0005, 0.006)


# ---------- música ----------
# Acordes por compasso (2 s): gancho em lá menor, virada para dó maior quando o app entra
# (anuncio: no círculo, 6 s; onibus: dentro do ônibus, 4 s).
GROOVE = 3 if PAGE == 'anuncio' else 2
TENSO = [(57, [57, 60, 64]), (53, [53, 57, 60])]                 # Am, F
FELIZ = [(48, [60, 64, 67]), (55, [59, 62, 67]), (57, [57, 60, 64]), (53, [57, 60, 65])]  # C G Am F

for bar in range(12):
    at = bar * 2.0
    if bar < GROOVE:
        root, chord = TENSO[bar % 2]
    else:
        root, chord = FELIZ[(bar - GROOVE) % 4]
    full = GROOVE <= bar      # groove completo depois da virada
    big = bar >= 10           # chamada final
    add(pad(chord + [chord[0] + 12], 2.0), at, 0.10 if not full else 0.07)
    # arpejo em colcheias
    arp = chord + [chord[1] + 12] if full else chord
    for k in range(8 if full else 4):
        n = arp[k % len(arp)] + (12 if full and k % 4 == 3 else 0)
        add(pluck(n, bright=1.0 if full else 0.6), at + k * (BEAT / 2 if full else BEAT), 0.16, pan=0.35 if k % 2 else -0.35)
    if bar >= 2:
        for k in range(8):
            add(hat(open_=(k % 2 == 1 and full)), at + k * BEAT / 2, 0.22 if full else 0.15, pan=0.2)
    if full:
        for b in range(4):
            add(kick(), at + b * BEAT, 0.9)
            if b in (1, 3):
                add(clap(), at + b * BEAT, 0.55)
            add(bass(root - 12 if root >= 48 else root, BEAT * 0.9), at + b * BEAT, 0.32)
            add(bass(root, BEAT * 0.4), at + b * BEAT + BEAT / 2, 0.2)
        if big:
            for b in range(4):
                add(pluck(chord[2] + 24, 0.3), at + b * BEAT + 0.25, 0.08)
    else:
        add(kick(), at, 0.35)  # pulso leve no gancho

# Final: acorde aberto que soa até o fim.
add(pad([60, 64, 67, 72, 76], 1.2), 22.8, 0.12)

# ---------- efeitos no tempo do vídeo ----------
def efeitos_anuncio():
    for at, f0 in ((0.2, 500), (0.7, 560), (1.2, 620), (2.0, 520), (2.45, 700)):
        add(pop(f0, f0 * 2), at, 0.35)
    add(pop(900, 260, 0.35), 2.85, 0.4)                 # "tudo?" desce
    for i in range(8):                                   # cartões do caos
        add(pop(400 + 60 * i, 700 + 60 * i, 0.08), 4.15 + i * 0.12, 0.18, pan=(-0.5 if i % 2 else 0.5))
    add(whoosh(0.4), 3.75, 0.35)
    add(whoosh(1.0, up=True), 4.9, 0.25)                 # sobe até a virada
    add(ding((72, 76, 79, 84), 1.4), 5.95, 0.35)         # círculo abre
    add(whoosh(0.45, up=False), 9.75, 0.4)
    add(click(), 11.95, 0.6)
    add(click(), 12.75, 0.6)
    add(ding(), 13.0, 0.55)                              # acertou
    add(ding((96, 100), 0.5), 14.05, 0.35)               # XP entra
    add(whoosh(0.4), 15.75, 0.35)
    for i in range(4):
        add(whoosh(0.3, up=False), 16.45 + i * 0.75, 0.22, pan=0.4)
    add(pop(700, 1500, 0.15), 19.15, 0.35)               # sequência de dias
    add(whoosh(0.6), 19.7, 0.45)
    add(ding((84, 88, 91, 96), 1.6), 20.3, 0.4)          # confete
    add(pop(500, 1200, 0.12), 21.4, 0.3)                 # botão do site


def rumble(dur):
    """Motor do ônibus: ruído grave com um vaivém lento."""
    t = t_axis(dur)
    n = lowpass(lowpass(rng.standard_normal(len(t)), 0.02), 0.05) * 8
    motor = 0.5 * np.sin(2 * np.pi * 42 * t + 2 * np.sin(2 * np.pi * 0.7 * t))
    return (n + motor) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.4 * t))


def thud():
    t = t_axis(0.4)
    f = 70 + 60 * np.exp(-t * 25)
    rattle = rng.standard_normal(len(t)) * np.exp(-t * 18) * 0.25
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + rattle) * env(t, 0.003, 0.12)


def efeitos_onibus():
    r = rumble(18.2)
    k = np.ones(len(r))
    tt = np.arange(len(r)) / SR
    k *= np.where((tt > 8) & (tt < 14.3), 0.45, 1.0)          # mais baixo com o celular na tela
    k *= np.minimum(1, (18.2 - tt) / 0.4)
    add(r * k, 0, 0.35)
    for b in (4.5, 6.0, 7.5, 12.25, 15.0, 16.5):              # buracos (mesmos de onibus.html)
        add(thud(), b, 0.7)
    for at, f0 in ((0.25, 520), (0.55, 600), (1.5, 700)):
        add(pop(f0, f0 * 2), at, 0.3)
    add(whoosh(1.0, up=True), 2.9, 0.35)                      # mergulho na janela
    add(pop(560, 1100), 4.1, 0.3)
    add(whoosh(0.7, up=True), 7.3, 0.35)                      # mergulho no celular
    add(click(), 9.95, 0.6)
    add(click(), 10.75, 0.6)
    add(ding(), 11.0, 0.55)                                   # acertou
    add(ding((96, 100), 0.5), 11.3, 0.3)                      # XP
    add(ding((79, 84, 88, 91), 1.4), 12.6, 0.45)              # fase concluída
    add(whoosh(0.5, up=False), 14.25, 0.35)
    add(pop(500, 1300, 0.18), 14.6, 0.35)                     # Tico comemora
    add(pop(700, 1500, 0.15), 15.4, 0.3)                      # sequência de dias
    add(ding((88, 84), 1.2), 16.45, 0.5)                      # campainha de parada
    add(whoosh(0.4), 17.75, 0.35)
    for i in range(3):
        add(pop(500 + 120 * i, 1000 + 120 * i, 0.1), 18.25 + i * 0.5, 0.3)
    add(whoosh(0.6), 19.7, 0.45)
    add(ding((84, 88, 91, 96), 1.6), 20.3, 0.4)               # confete
    add(pop(500, 1200, 0.12), 21.4, 0.3)                      # botão do site


(efeitos_anuncio if PAGE == 'anuncio' else efeitos_onibus)()

# ---------- saída ----------
fade = np.minimum(1, (DUR - np.arange(N) / SR) / 0.5)
stereo = np.stack([mix_l * fade, mix_r * fade], axis=1)
stereo /= max(1e-9, np.abs(stereo).max()) / 0.9
pcm = (stereo * 32767).astype(np.int16)

NOME = 'trilha.wav' if PAGE == 'anuncio' else f'trilha-{PAGE}.wav'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saida')
os.makedirs(out, exist_ok=True)
crua = os.path.join(out, 'trilha-crua.wav')
with wave.open(crua, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', crua, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
                '-ar', str(SR), os.path.join(out, NOME)], check=True)
os.remove(crua)
print(f'trilha: saida/{NOME}')
