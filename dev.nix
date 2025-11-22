
{ pkgs, ... }: {
  # Канал nixpkgs для использования.
  channel = "stable-24.05"; # или "unstable"

  # Пакеты для установки. Используйте https://search.nixos.org/packages для поиска.
  packages = [
    pkgs.nodejs_20
    pkgs.python3
    pkgs.caddy # Простой веб-сервер для обслуживания статических файлов
  ];

  # Переменные среды для установки в рабочей области.
  env = {};

  idx = {
    # Расширения VS Code для установки из Open VSX Registry.
    extensions = [
      "ms-python.python" # Поддержка Python
    ];

    # Включаем и настраиваем предварительный просмотр.
    previews = {
      enable = true;
      previews = {
        web = {
          # Запускаем Caddy для обслуживания текущего каталога.
          command = ["caddy" "file-server" "--listen" ":$PORT" "--browse"];
          manager = "web";
        };
      };
    };

    # Хуки жизненного цикла рабочей области.
    workspace = {
      # Запускается при первом создании рабочей области.
      onCreate = {
        # Открываем эти файлы по умолчанию.
        default.openFiles = [ "index.html" "script.js" "sentient_agent.py" ];
      };
    };
  };
}
