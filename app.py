
import os
import json
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# 1. Инициализация Flask-приложения
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # Разрешаем CORS-запросы со всех доменов

# 2. Функция для запроса к API Nous (ваш бывший основной код)
# КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: API-ключ теперь читается из переменных окружения
def request_style_from_nous(mood: str, theme: str, system_prompt: str) -> dict:
    """
    Отправляет безопасный запрос к Nous API.
    """
    # Render.com и другие хостинги позволяют устанавливать секретные переменные окружения.
    # Мы будем использовать переменную с именем NOUS_API_KEY.
    api_key = os.environ.get('NOUS_API_KEY')
    
    if not api_key:
        # Если ключ не найден, возвращаем ошибку, а не падаем
        return {"error": "API key is not configured on the server."}

    url = 'https://inference-api.nousresearch.com/v1/chat/completions'
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    body = {
        "model": "DeepHermes-3-Mistral-24B-Preview",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a style for the mood: {mood}"}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=body)
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content']
        cleaned_json = content.replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned_json)
    except Exception as e:
        # Обрабатываем любые ошибки, которые могут возникнуть
        return {"error": str(e)}

# 3. Создание API-маршрута (API Endpoint)
@app.route('/api/generate', methods=['POST'])
def handle_generation():
    """
    Этот маршрут будет вызываться из нашего JavaScript.
    Он принимает 'mood' и 'theme', а затем возвращает сгенерированный стиль.
    """
    data = request.get_json()
    mood = data.get('mood')
    theme = data.get('theme')
    system_prompt = data.get('system_prompt')

    if not mood or not theme or not system_prompt:
        return jsonify({"error": "Missing mood, theme, or system_prompt in request"}), 400

    style = request_style_from_nous(mood, theme, system_prompt)
    
    if "error" in style:
        # Если произошла ошибка (например, с ключом), сообщаем об этом фронтенду
        return jsonify(style), 500
        
    return jsonify(style)

# 4. Маршруты для обслуживания статических файлов (HTML, CSS, JS, шейдеры)
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    # Этот маршрут будет отдавать style.css, script.js и файлы .frag
    return send_from_directory('.', path)

# 5. Запуск сервера
if __name__ == '__main__':
    # Render будет использовать gunicorn, но для локальной разработки
    # мы используем встроенный сервер Flask.
    # PORT будет предоставлен Render автоматически.
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
