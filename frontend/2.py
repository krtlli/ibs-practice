from PIL import Image, ImageSequence
import io

from PIL import Image, ImageSequence
import io
import math


def rgb_distance(c1, c2):
    return math.sqrt(
        (c1[0] - c2[0]) ** 2 +
        (c1[1] - c2[1]) ** 2 +
        (c1[2] - c2[2]) ** 2
    )


def replace_color_pillow(input_path, output_path, base_color, new_color_rgb, tolerance_percent=25):
    """
    base_color: (R, G, B) - цвет, который ищем
    new_color_rgb: (R, G, B) - цвет, на который меняем
    tolerance_percent: 0-100 - насколько цвет может отличаться (25%)
    """
    max_dist = (tolerance_percent / 100.0) * math.sqrt(255 ** 2 * 3)

    with open(input_path, 'rb') as f:
        img_data = f.read()

    frames = []
    im = Image.open(io.BytesIO(img_data))

    for frame in ImageSequence.Iterator(im):
        frame = frame.convert("RGBA")
        data = frame.load()
        w, h = frame.size

        for y in range(h):
            for x in range(w):
                r, g, b, a = data[x, y]
                current_pixel = (r, g, b)

                # Проверяем расстояние до базового цвета
                if rgb_distance(current_pixel, base_color) <= max_dist:
                    # Если совпадает (в пределах 25%), красим в новый цвет, сохраняя альфа-канал
                    data[x, y] = (*new_color_rgb, a)

        frames.append(frame)

    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=im.info.get('duration', 100),
        loop=im.info.get('loop', 0),
        disposal=2
    )


from PIL import Image, ImageSequence
import io
import math


def replace_color_to_transparent(input_path, output_path, base_color=(255, 255, 255), tolerance_percent=25):
    # Считаем максимальное расстояние для допуска
    max_dist = (tolerance_percent / 100.0) * math.sqrt(255 ** 2 * 3)

    with open(input_path, 'rb') as f:
        img_data = f.read()

    frames = []
    im = Image.open(io.BytesIO(img_data))

    for frame in ImageSequence.Iterator(im):
        # Конвертируем в RGBA, чтобы иметь доступ к альфа-каналу
        frame = frame.convert("RGBA")
        data = frame.load()
        w, h = frame.size

        for y in range(h):
            for x in range(w):
                r, g, b, a = data[x, y]
                # Если цвет попадает в диапазон допуска
                if rgb_distance((r, g, b), base_color) <= max_dist:
                    # Делаем пиксель полностью прозрачным (R=0, G=0, B=0, A=0)
                    data[x, y] = (0, 0, 0, 0)

        frames.append(frame)

    # ГЛАВНОЕ ИСПРАВЛЕНИЕ:
    # 1. Мы сохраняем первый кадр как "базовый" для палитры.
    # 2. Ключевой параметр: transparency=0.
    #    Это говорит GIF-кодеру: "Цвет с индексом 0 в палитре (а это будет чёрный) сделай прозрачным".
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=im.info.get('duration', 100),
        loop=im.info.get('loop', 0),
        disposal=2,
        transparency=0  # <--- ВОТ ЭТО ВАЖНО! Индекс 0 = чёрный цвет = прозрачный
    )


# Пример использования: заменить (255, 0, 0) — красный — на (0, 0, 255) — синий
for x in range(5,6):
    replace_color_pillow(f"{x}.gif", f"{x}1.gif", (51, 204, 204), (64, 40, 222),25)
    replace_color_to_transparent(f"{x}1.gif", f"{x}2.gif", (255, 255, 255), 40)

