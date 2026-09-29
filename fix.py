with open('C:/Users/Shaurya/OneDrive/Desktop/SIH2/frontend/src/pages/Telemetry.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r'\\$', '$')
content = content.replace(r'\', '')

with open('C:/Users/Shaurya/OneDrive/Desktop/SIH2/frontend/src/pages/Telemetry.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
