# sentient_agent.py
# ПРИМЕЧАНИЕ: Этот код является концептуальной демонстрацией.
# Он требует наличия библиотеки `sentient-agent` и соответствующей настройки.

import json
import requests
# Предполагается, что существует библиотека sentient_agent
# from sentient_agent import Agent, tool, Pipeline

# --- Определение инструментов (Tools) ---

# @tool
def request_cosmic_style_from_nous(mood: str) -> dict:
    """
    Отправляет запрос к Nous API для генерации JSON-стиля космоса на основе настроения.
    """
    api_key = 'sk-7l89m19dfmdqo114vxrhj' # ВАЖНО: Управление ключами должно быть безопасным!
    url = 'https://inference-api.nousresearch.com/v1/chat/completions'

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    system_prompt = """
    You output ONLY valid JSON for cosmic generation based on the user's mood. 
    The JSON should follow this exact structure: 
    { 
      "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], 
      "nebula": { "intensity": float, "movement": float, "detail": float }, 
      "stars": { "count": integer, "twinkleSpeed": float }, 
      "effects": { "clickFlash": boolean, "mouseDistortion": boolean, "colorShift": boolean }, 
      "camera": { "rotationSpeed": float, "zoomSpeed": float } 
    }
    """

    body = {
        "model": "DeepHermes-3-Mistral-24B-Preview",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate cosmic style for mood: {mood}"}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=body)
        response.raise_for_status() # Вызовет исключение для кодов 4xx/5xx
        
        content = response.json()['choices'][0]['message']['content']
        # Очистка от возможных блоков кода markdown
        cleaned_json = content.replace('```json', '').replace('```', '').strip()
        
        return json.loads(cleaned_json)
    except (requests.RequestException, json.JSONDecodeError) as e:
        print(f"Ошибка при вызове API или парсинге JSON: {e}")
        return {"error": str(e)}

# @tool
def save_style_to_file(name: str, style_json: dict):
    """
    Сохраняет сгенерированный стиль в локальный файл.
    """
    filename = f"saved_styles/{name.replace(' ', '_')}.json"
    with open(filename, 'w') as f:
        json.dump(style_json, f, indent=4)
    return f"Стиль сохранен в {filename}"

# --- Определение Агентов (Agents) ---

# class MoodInterpreterAgent(Agent):
#     """
#     Агент, который интерпретирует настроение пользователя и генерирует стиль.
#     """
#     def __init__(self):
#         super().__init__(name="MoodInterpreter", description="Генерирует космический стиль по настроению.")
#         self.add_tool(request_cosmic_style_from_nous)

#     def run(self, mood: str) -> dict:
#         print(f"[MoodInterpreter] Получено настроение: {mood}")
#         style = self.tools.request_cosmic_style_from_nous(mood=mood)
#         print(f"[MoodInterpreter] Стиль сгенерирован: {style}")
#         return style

# class CosmicStyleManagerAgent(Agent):
#     """
#     Агент для управления (сохранение/загрузка) стилями.
#     """
#     def __init__(self):
#         super().__init__(name="CosmicStyleManager", description="Управляет файлами стилей.")
#         self.add_tool(save_style_to_file)

#     def save_style(self, name: str, style_json: dict) -> str:
#         print(f"[CosmicStyleManager] Сохранение стиля '{name}'")
#         return self.tools.save_style_to_file(name=name, style_json=style_json)

# --- Определение Конвейера (Pipeline) ---

# def create_cosmic_style_pipeline():
#     """
#     Создает и связывает агентов в конвейер.
#     """
#     mood_agent = MoodInterpreterAgent()
#     style_manager_agent = CosmicStyleManagerAgent()

#     # Определение потока данных
#     pipeline = Pipeline(description="Полный процесс от настроения до сохранения стиля")
#     pipeline.add_agent(mood_agent)
#     pipeline.add_agent(style_manager_agent)

#     # Связывание (концептуальное)
#     # pipeline.connect(mood_agent.output, style_manager_agent.input['style_json'])
    
#     return pipeline

# --- Пример использования ---

if __name__ == '__main__':
    print("--- Демонстрация архитектуры агентов Sentient AGI ---")
    
    # 1. Инициализация агентов (вручную, без pipeline для простоты)
    mood_interpreter = "MoodInterpreterAgent()" # MoodInterpreterAgent()
    style_manager = "CosmicStyleManagerAgent()" # CosmicStyleManagerAgent()

    # 2. Пользовательский ввод
    user_mood = "chaotic and vibrant"
    
    # 3. Запуск первого агента
    print(f"\nШаг 1: Пользователь вводит настроение -> {mood_interpreter}")
    # сгенерированный_стиль = mood_interpreter.run(mood=user_mood)
    сгенерированный_стиль = request_cosmic_style_from_nous(mood=user_mood)


    if "error" not in сгенерированный_стиль:
        print(f"\nРезультат от {mood_interpreter}:\n{json.dumps(сгенерированный_стиль, indent=2)}")
        
        # 4. Запуск второго агента для сохранения
        # print(f"\nШаг 2: JSON -> {style_manager} для сохранения")
        # save_result = style_manager.save_style(name=user_mood, style_json=сгенерированный_стиль)
        # print(f"\nРезультат от {style_manager}: {save_result}")
    else:
        print(f"\nНе удалось сгенерировать стиль: {сгенерированный_стиль['error']}")

    print("\n--- Демонстрация завершена ---")

