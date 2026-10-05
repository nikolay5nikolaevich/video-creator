#!/bin/bash
# Сборка кадров из сборка/frames/ в вертикальное видео 1080x1920 60 fps.
# Запускать из папки ролика: bash ../build.sh готовое/имя.mp4 [сборка/sfx.wav]
# Кадр — окно Studio целиком (1924x1055). Вьюпорт в режиме Play: x=4, y=108, 1692x858;
# берём правые 1525 px (16:9), чтобы отрезать кнопки Roblox слева, и поворачиваем набок.
VF="crop=1525:858:171:108,transpose=2,scale=1080:1920:flags=lanczos"
if [ -n "$2" ]; then
  ffmpeg -v error -y -framerate 60 -i сборка/frames/f%05d.png -i "$2" -vf "$VF" -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "$1"
else
  ffmpeg -v error -y -framerate 60 -i сборка/frames/f%05d.png -vf "$VF" -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$1"
fi
