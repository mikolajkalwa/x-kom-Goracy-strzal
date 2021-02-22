Skrypt pobierający informację co aktualnie znajduje się na gorącym strzale w [x-komie](https://x-kom.pl), następnie przesyła tą informację poprzez webhooka na [Discorda](https://discordapp.com/).

#### Instrukcja uruchomienia: 
* Należy zainstalować [Node.js w wersji LTS](https://nodejs.org/en/).
* Sklonować to repozytorium na swój dysk.
* Przejsć do [pliku z konfiguracją](config.json). Należy w nim podać adres URL [webhooka](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks) lub tablicę zawierającą URL'e webhooków.
* Przejść do folderu z repozytorium i uruchomić komendę `npm install`.

#### Zalecany scenariusz użycia: 
* W przypadku serwera skonfigurować cron-a (albo inny dowolny scheduler) w taki sposób aby uruchamiał on `node app.js` codziennie minutę przed godziną 10 i 22