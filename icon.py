from PIL import Image, ImageDraw, ImageFont
import sys

img = Image.new('RGBA', (192, 192), (26, 26, 46, 255))
d = ImageDraw.Draw(img)
d.rounded_rectangle([16,16,176,176], radius=36, fill=(255,107,107,255))
d.text((96, 80), "📅", anchor="mm", font=ImageFont.load_default())
img.save('icon.png')