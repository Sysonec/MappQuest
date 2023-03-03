"use strict";

let dataCountries;
let antarctica;

// Import Antarctica as a standalone polygon
fetch("./antarctica.geo.json")
  .then((response) => response.json())
  .then((data) => {
    // use the parsed JSON data here
    antarctica = data;
  })
  .catch((error) => {
    console.error("Error loading JSON file:", error);
  });

// Import countries from dataCountries
fetch("./custom.geo.json")
  .then((response) => response.json())
  .then((data) => {
    // use the parsed JSON data here
    dataCountries = data;

    // DOM elements
    const gameMain = document.querySelector(".game");
    const startGameBtn = document.querySelector("#start-game");
    const startGame = document.querySelector(".start-game");
    const startGameContent = document.querySelector(".start-game-content");
    const gameOptions = document.querySelector(".game-options");
    const startFlagsGameBtn = document.querySelector("#start-flags-game");
    const guessFlagsGame = document.querySelector(".guess-flags-game");
    const findFlagName = document.querySelector(".find-flag-name");
    const guessFlags = document.querySelector(".guess-flags");
    const gameContainer = document.querySelector(".game-container");
    const findCountryName = document.querySelector("#find-country-name");
    const countryFindModal = document.querySelector("#map-modal");
    const loader = document.querySelector(".loader-container");
    const gameDetailsNav = document.querySelector(".game-details");
    const gameDetailBtns = document.querySelector(".game-detail-buttons");
    const buttonsContainer = document.querySelector(".buttons-container");
    const guessesLeftGame = document.querySelector("#guesses-num");
    const scoreGame = document.querySelector("#score-num");
    const highscoreGame = document.querySelector("#highscore-num");
    const timerLeft = document.querySelector(".timer-count-left");
    const zoomControls = document.querySelector(".zoom-controls");
    const collapseBtn = document.querySelector(".collapse-btn");

    class ToMapp {
      // Public class fields
      map;
      geojson;
      coords;

      constructor() {}

      // Load world map
      _loadMap() {
        this._loadPosition();
      }

      // Generate random location
      _generateRandomLocation() {
        const lat = Math.random() * 180 - 90;
        const lng = Math.random() * 360 - 180;

        return [lat, lng];
      }

      // Load starting random position
      _loadPosition() {
        // Random location
        const randomLocation = this._generateRandomLocation();

        this.coords = randomLocation;

        this.map = L.map("map", {
          zoomControl: false,
          maxBoundsViscosity: 0.0,
          minZoom: 1.0,
          maxZoom: 20,
        }).setView(this.coords, 3);

        // Max bounds to prevent errors and dragging outside of the map
        this.map.setMaxBounds([
          [-100, -250],
          [100, 250],
        ]);

        // Add tiles
        this._createTiles(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
        );

        this._loadPolygons();
      }

      // Load Antarctica
      _loadAntarcitca() {
        L.geoJSON(antarctica, {
          style: function () {
            return {
              fillColor: "#7792D1",
              weight: 2,
              opacity: 1,
              color: "#2E4372",
              fillOpacity: 0.7,
            };
          },
        }).addTo(this.map);
      }

      // Load polygons
      _loadPolygons() {
        // Main Polygons
        const gridLayer = L.gridLayer({ noWrap: true });

        // Set all functions
        this._setAllFunctions.bind(this);

        // Create GeoJSON
        this.geojson = L.geoJSON(dataCountries, {
          style: function () {
            return {
              fillColor: "#241403",
              weight: 2,
              opacity: 1,
              color: "#2c2620",
              fillOpacity: 0.7,
            };
          },

          // Bind 'this' to setAllFunctions to the current object and prevent undefined listener error
          onEachFeature: this._setAllFunctions.bind(this),
        }).addTo(this.map);

        // ANTARCTICA
        this._loadAntarcitca();
      }

      _createTiles(mapType) {
        L.tileLayer(`${mapType}`, {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
          noWrap: true,
        }).addTo(this.map);
      }
    }

    const app = new ToMapp();

    class GameState extends ToMapp {
      // Private class fields
      #randomCountry;
      #randomCountryDetails;
      #randomCountryI;
      #countryCoords = [];
      #countryFound;
      #guessesLeft;
      #score = 0;
      #highscore = 0;
      #gameOver = false;
      #timerInterval;
      #mapClueBtn;
      #clueTimer;
      #sec;
      #min;
      #audio;
      #audioEffects;
      #audioEffectsSlider;
      #audioSlider;
      #countDownTimer;
      #difficulty;
      #countriesToGuess = [];
      #savedVol;
      #savedVolEffects;
      #savedTime;
      #markerName;
      #markers = [];
      #marker;
      #markerFound;
      #markerIndex;
      #popup;
      #zoomControlsVisible;
      #countryTrivia =
        JSON.parse(window.localStorage.getItem("countryTrivia")) === null
          ? true
          : JSON.parse(window.localStorage.getItem("countryTrivia"));

      // Start game
      constructor() {
        super();

        this.#audioEffects = new Audio();

        // Start game
        startGameBtn.addEventListener("click", this._startGame.bind(this));

        // Choose difficulty
        gameOptions.addEventListener(
          "click",
          this._chooseDiffuculty.bind(this)
        );

        // Start flags game
        startFlagsGameBtn.addEventListener("click", this._flagsGame.bind(this));

        // Listen for flag clicks
        guessFlagsGame.addEventListener("click", this._guessFlag.bind(this));

        // Randomize countries
        this._randomizeCountries();

        // Set timer
        gameMain.addEventListener("input", (e) => {
          this._setTimer(e);
          this._settingsControl(e);
        });

        // Timer stop btn
        gameDetailsNav.addEventListener("click", this._stopTimer.bind(this));

        zoomControls.addEventListener("click", this._handleZoom.bind(this));

        // Game details btns
        buttonsContainer.addEventListener(
          "click",
          this._handleClicks.bind(this)
        );

        // Find country (forfeit)
        countryFindModal.addEventListener(
          "click",
          this._runModalActions.bind(this)
        );
      }

      // Play music
      _playMusic() {
        this.#audio = new Audio("./media/audio/music.mp3");
        this.#audio.loop = true;
        this.#audio.volume = JSON.parse(
          window.localStorage.getItem("audioVolume")
        );

        // Make sure the range stays at correct volume (localStorage)
        this.#savedVol = this.#audio.volume;

        this.#audio.play();

        if (JSON.parse(window.localStorage.getItem("audioVolume")) === null) {
          this.#audio.volume = 1;
          this.#savedVol = this.#audio.volume;
        }

        this.#audio.muted = JSON.parse(
          window.localStorage.getItem("audioMusicMuted")
        );
      }

      // Play sound effects
      _loadSoundEffects() {
        this.#audioEffects.volume = JSON.parse(
          window.localStorage.getItem("audioEffectsVolume")
        );
        if (
          JSON.parse(window.localStorage.getItem("audioEffectsVolume")) === null
        ) {
          this.#audioEffects.volume = 1;
          this.#savedVolEffects = this.#audioEffects.volume;
        }
        this.#savedVolEffects = this.#audioEffects.volume;
      }

      // Higlight polygon on mouse hover
      _hoverHighlight(e) {
        const layer = e.target;

        layer.setStyle({
          weight: 5,
          color: "#95816C",
          fillColor: "#b9aa9a",
          dashArray: "",
          fillOpacity: 0.8,
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      }

      // Reset polygon highlight
      _resetHighlight(e) {
        this.geojson.resetStyle(e.target);
      }

      // Play sound
      _playSound(filePath) {
        this.#audioEffects = new Audio(filePath);
        const audioEffectsSaved = JSON.parse(
          window.localStorage.getItem("audioEffectsVolume")
        );

        this.#audioEffects.volume =
          audioEffectsSaved === null ? 1 : audioEffectsSaved;

        const audioEffectsMuted = JSON.parse(
          window.localStorage.getItem("audioEffectsMuted")
        );
        if (audioEffectsMuted === true) {
          this.#audioEffects.muted = true;
        }
        this.#audioEffects.play();
      }

      // Show flags game
      _showFlagsGameContent() {
        this._hideElement(startGameContent);
        this._showElement(guessFlagsGame);
      }

      // Show start game menu
      _showStartGameContent() {
        this._hideElement(guessFlagsGame);
        this._showElement(startGameContent);
      }

      // Go back to main menu
      _gameOptionsBack() {
        this._hideElement(gameOptions);
        this._showElement(startGameContent);
      }

      // Get country data
      async _getCountryData(countryCode) {
        const response = await fetch(
          `https://restcountries.com/v3.1/alpha/${countryCode}`
        );
        const data = await response.json();
        return data;
      }

      // Start flags game
      async _flagsGame() {
        if (guessFlags.innerHTML === "") {
          this._showFlagsGameContent();

          let randomCountry;
          let countriesFound = [];

          const randomCountryFlags = [];

          // Pick 3 random flag indexes from dataCountries.features
          for (let i = 0; i < 3; i++) {
            const randomFlag = Math.floor(
              Math.random() * dataCountries.features.length
            );

            if (!randomCountryFlags.includes(randomFlag)) {
              randomCountryFlags.push(randomFlag);
            }
          }

          // Use Promise.all to fetch country data for each flag and populate countriesFound and countryCodes
          const countryCodes = await Promise.all(
            randomCountryFlags.map(async (randomFlag) => {
              randomCountry = dataCountries.features[randomFlag];
              const countryCodeAlt = randomCountry.properties.adm0_iso;
              const countryCode = randomCountry.properties.iso_a2_eh;
              const countryCodeToUse = countryCode || countryCodeAlt;

              const countryData = await this._getCountryData(countryCodeToUse);

              const findCountry = countryData.find(
                (country) => country.cca2 === countryCode
              );
              countriesFound.push(findCountry);

              return countryCodeToUse;
            })
          );

          // Pick a random country code from the three and get the corresponding country object
          const randomCountryCode = countryCodes[Math.floor(Math.random() * 3)];

          const countryFound = countriesFound.find(
            (country) => country.cca2 === randomCountryCode
          );

          // Set global country var to countryFound
          this.#countryFound = countryFound;

          // Display the name of the country to find
          findFlagName.textContent = `Can you find ${countryFound.name.common}?`;

          // Create buttons with each flag, using the data attributes to store the country code and code alternative, and joining the array into a string of HTML
          guessFlags.innerHTML = countryCodes
            .map((countryCode) => {
              const countryFound = countriesFound.find(
                (country) => country.cca2 === countryCode
              );
              return `<button class="guess-flag-btn" data-country-code="${countryCode}" data-country-code-alt="${countryFound?.cca3}">
        <img class="guess-flag-img" src="${countryFound?.flags?.png}" alt="${countryFound?.name?.common}"/>
      </button>`;
            })
            .join("");
        } else {
          this._showFlagsGameContent();
        }
      }

      // Flags game new round
      _guessFlagsNewRound() {
        guessFlags.classList.add("unclickable-flags");
        setTimeout(() => {
          // Clear both find flag name text and guess flags el
          this._clearElement(findFlagName);
          this._clearElement(guessFlags);

          // Request new flags
          this._flagsGame();

          guessFlags.classList.remove("unclickable-flags");
        }, 3000);
      }

      // Guess flags by name
      _guessFlag(e) {
        const countryCode = e.target.dataset.countryCode;
        const countryCodeAlt = e.target.dataset.countryCodeAlt;
        const btn = e.target.closest("button");
        const guessBtns = document.querySelectorAll(".guess-flag-btn");

        const correctGuess =
          (btn?.classList.contains("guess-flag-btn") &&
            countryCode === this.#countryFound.cca2) ||
          (btn?.classList.contains("guess-flag-btn") &&
            countryCodeAlt === this.#countryFound.cca2);

        const incorrectGuess =
          (btn?.classList.contains("guess-flag-btn") &&
            countryCode !== this.#countryFound.cca2) ||
          (btn?.classList.contains("guess-flag-btn") &&
            countryCodeAlt !== this.#countryFound.cca2);

        if (correctGuess) {
          findFlagName.textContent = `You've found the flag of ${
            this.#countryFound.name.common
          }!`;

          guessBtns.forEach((btn) => {
            if (btn !== e.target) {
              btn.classList.add("incorrect-flag");
            }

            if (btn === e.target) {
              btn.classList.add("correct-flag");
            }
          });

          // Start new round after a brief pause
          this._guessFlagsNewRound();
        } else if (incorrectGuess) {
          findFlagName.textContent = `Doesn't seem right. The flag of ${
            this.#countryFound.name.common
          } looks like this:`;
          guessBtns.forEach((btn) => {
            if (
              btn.dataset.countryCode !== this.#countryFound.cca2 &&
              btn.dataset.countryCodeAlt !== this.#countryFound.cca2
            ) {
              btn.classList.add("incorrect-flag");
            }
          });

          // Start new round after a brief pause
          this._guessFlagsNewRound();
        }

        if (btn?.classList.contains("go-back-btn")) {
          this._showStartGameContent();
        }
      }

      // Display country info
      _displayCountryInfo() {
        return new Promise((resolve, reject) => {
          // Get country codes
          const countryCode = this.#randomCountryDetails.properties.iso_a2_eh;
          const countryCodeAlt = this.#randomCountryDetails.properties.adm0_iso;

          // If either country code matches request country data
          this._getCountryData(
            countryCode === undefined ? countryCodeAlt : countryCode
          ).then((data) => {
            const findCountry = data.filter(
              (country) => country.cca2 === countryCode
            );
            const countryFound = findCountry[0];
            const currencies = Object.values(countryFound.currencies);

            let currencyResult = "";

            currencies.forEach((currency, i) => {
              currencyResult += `${currency.name} (${currency.symbol})`;

              if (i + 1 < currencies.length) {
                currencyResult += ", ";
              }
            });

            // Country details
            const info = {
              countryFound: countryFound,
              languages: Object.values(countryFound.languages),
              population: countryFound.population.toLocaleString(),
              capitalCity: countryFound.capital,
              flagImg: countryFound.flags.png,
              flagAlt: countryFound.flags.alt,
              currencies: currencyResult,
            };

            resolve(info);
          });
        });
      }

      // Click polygon score
      _clickScore(e) {
        const countryClick = e.target.feature.properties.name_en;

        const layer = e.target;
        let popupCorrect;

        const validCountry = (country) => country === this.#randomCountry;

        // Country valid
        if (validCountry(countryClick)) {
          layer.setStyle({
            color: "#277330",
            fillColor: "#277330",
          });

          // Display trivia only if turned on
          if (this.#countryTrivia === true) {
            const countryInfo = this._displayCountryInfo();

            countryInfo.then((info) => {
              const coords = e.latlng;

              // Create trivia popup (only when correct)
              popupCorrect = L.popup({
                className: "popup-custom",
                autoPan: false,
              }).setLatLng(coords).setContent(`
            <div class="popup-correct-info">
              <img class="popup-correct-img" src=${info.flagImg} alt="${
                info.flagAlt
              }">
              <p>You've found: <span>${countryClick}</span></p>
              <p><i class="fa-solid fa-building-columns"></i> Capital: <span>${
                info.capitalCity
              }</span></p>
              <p><i class="fa-solid fa-language"></i> Language: <span>${info.languages.join(
                ", "
              )}</span></p>
              <p><i class="fa-solid fa-people-roof"></i> Population: <span>${
                info.population
              }</span></p>
              <p><i class="fa-solid fa-money-bill-wave"></i> Currency: <span style="word-wrap: break-word;">${
                info.currencies
              }</span></p>
            </div>`);

              this.map.openPopup(popupCorrect);
            });
          } else if (this.#countryTrivia === false && popupCorrect) {
            this.map.removeLayer(popupCorrect);
          }

          // Increase score
          this._scoreIncrease();

          // If score higher current highscore - Save
          this._highscoreIncrease();

          // Play sound
          this._playSound("./media/audio/goodGuess.mp3");

          if (timerLeft.classList.contains("input-time-active")) {
            this.#sec += 15;
          }

          if (this.#mapClueBtn) {
            this.#mapClueBtn.classList.remove("clue-on", "timer-on");
            // Enable map clue btn after correct guess
            this._enableBtn(this.#mapClueBtn);

            if (this.#mapClueBtn.classList.contains("timer-on")) {
              this._disableBtn(this.#mapClueBtn);
            }
          }

          // Increase score and display green color overlay with setTimeout
          setTimeout(() => {
            this._randomizeCountries();
            this._findingCountryName();
          }, 100);
        }

        // Country invalid
        if (!validCountry(countryClick)) {
          layer.setStyle({
            color: "#A90B13",
            fillColor: "#A90B13",
          });

          if (this.#countryTrivia === false) {
            layer.unbindPopup(popupCorrect).closePopup();
          }

          if (this.#countryTrivia === false && popupCorrect) {
            this.map.removeLayer(popupCorrect);
          }

          // Play sound
          this._playSound("./media/audio/badGuess.mp3");

          // Decrease guesses
          this._guessesLeftDecrease();
        }
      }

      // Set all functions
      _setAllFunctions(feature, layer) {
        layer.on({
          mouseover: this._hoverHighlight,
          // Binding this to mouseout prevents this error --> Cannot read private member geojson from an object whose class did not declare it
          mouseout: this._resetHighlight.bind(this),
          // Binding this to click sets this keyword to actual country clicked, it wasn't previously working due to this being undefined, so either outcome of the click is FALSE
          click: this._clickScore.bind(this),
        });
      }

      // Display zoom controls
      _displayZoomControls() {
        let zoomControlsOn = JSON.parse(
          window.localStorage.getItem("zoomControlsVisible")
        );

        if (zoomControlsOn === false) {
          this._hideVisible(zoomControls);
        }

        if (zoomControlsOn === true) {
          this._showInvisible(zoomControls);
        }

        if (
          JSON.parse(window.localStorage.getItem("zoomControlsVisible")) ===
          undefined
        ) {
          zoomControlsOn = true;
        }
      }

      // Start game
      _startGame() {
        // Hide start game content
        this._hideElement(startGameContent);

        // Show option menu before starting
        this._showElement(gameOptions);

        // Display zoom controls (if hidden)
        this._displayZoomControls();
      }

      // Choose difficulty
      _chooseDiffuculty(e) {
        const btn = e.target.closest("button");

        const btnsHard = [
          document.querySelector(".est-position-btn"),
          document.querySelector(".map-clue-btn"),
        ];

        const removeBtns = (btns) => {
          btns.forEach((btn) => {
            btn.remove();
          });
        };

        if (btn?.classList.contains("easy-mode-btn")) {
          this.#difficulty = "easy";
          this.#guessesLeft = 15;
        }

        if (btn?.classList.contains("medium-mode-btn")) {
          this.#difficulty = "medium";
          this.#guessesLeft = 10;
        }

        if (btn?.classList.contains("hard-mode-btn")) {
          this.#difficulty = "hard";
          this.#guessesLeft = 5;
          removeBtns(btnsHard);
        }

        if (!btn) {
          return;
        }

        if (btn?.classList.contains("go-back-btn")) {
          this._gameOptionsBack();
        } else {
          // Clear flags minigame
          this._clearElement(findFlagName);
          this._clearElement(guessFlags);

          // Loader
          this._loader(false, true);

          // Hide start game menu
          this._hideElement(startGame);

          // Display guesses left based on difficulty
          this._guessesLeft();

          // Display starting score
          this._displayScore();

          // Display highscore
          this._displayHighscore();

          // Show name of country to find
          this._findingCountryName();

          // Load sound effects
          this._loadSoundEffects();

          // Play music
          this._playMusic();
        }
      }

      // Pick country
      _pickRandomCountry() {
        this.#randomCountryI = Math.floor(
          Math.random() * dataCountries.features.length
        );

        this.#randomCountry = dataCountries.features.find(
          (country) => country === dataCountries.features[this.#randomCountryI]
        ).properties.name_en;

        // Get random country object
        this.#randomCountryDetails = dataCountries.features.find(
          (country) => country === dataCountries.features[this.#randomCountryI]
        );
      }
      // Randomize countries
      _randomizeCountries() {
        this._pickRandomCountry();

        this.#countriesToGuess.push(this.#randomCountry);

        // If duplicate country rolled, roll again and remove from array
        this.#countriesToGuess.forEach((country, i) => {
          if (
            this.#countriesToGuess.indexOf(country) !==
            this.#countriesToGuess.lastIndexOf(country)
          ) {
            // Perform some action
            this._pickRandomCountry();

            // Remove last duplicate
            this.#countriesToGuess.pop();
          }
        });

        if (this.#countriesToGuess.length === dataCountries.features.length) {
          // Remove layer for map details & visibility
          this._createTiles(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          );

          // Reset GeoJSON
          this._resetGeoJSON();

          // Disable buttons
          this._disableBtns();

          // Disable timer if running
          if (timerLeft) {
            this._hideElement(timerLeft);
            clearInterval(this.#timerInterval);
          }

          this._openModal("guessedAll");
        }
      }

      // Show name of the country
      _findingCountryName() {
        // Set find country to randomly selected country
        findCountryName.innerHTML = this.#randomCountry;

        // If difficulty set to hard, display a flag in place of country name
        if (this.#difficulty === "hard") {
          const countryInfo = this._displayCountryInfo();

          countryInfo.then((info) => {
            if (info.countryFound === undefined) {
              findCountryName.innerHTML = this.#randomCountry;
            } else {
              findCountryName.innerHTML = `<img class="hard-mode-flag" src="${info.flagImg}" alt="${info.flagAlt}"/>`;
            }
          });
        }
      }

      // Find country modal
      _openModal(modalName) {
        // Saved time to use in timerModal
        const savedTime = JSON.parse(window.localStorage.getItem("savedTime"));

        // Only display saved time, otherwise value is empty
        const calcSavedtime = () =>
          savedTime ? this._getSavedTime() : ["", ""];

        // Check switch btns if localStorage set
        // Check sound switch
        const musicMuted = JSON.parse(
          window.localStorage.getItem("audioMusicMuted")
        );
        const soundsMuted = JSON.parse(
          window.localStorage.getItem("audioEffectsMuted")
        );
        const switchSoundChecked = musicMuted === true && soundsMuted === true;

        // Check fullscreen switch
        const fullScreenChecked = Boolean(document.fullscreenElement);

        // Check zoom controls switch
        const zoomControlsOn = JSON.parse(
          window.localStorage.getItem("zoomControlsVisible")
        );
        if (zoomControlsOn === undefined) {
          zoomControlsOn = false;
        }

        // Check country trivia switch
        const countryTriviaOn =
          JSON.parse(window.localStorage.getItem("countryTrivia")) !== false;

        // Clear modal content
        this._clearElement(countryFindModal);

        let html = "";

        if (modalName === "countryFindModal")
          html = `
      <div class="map-modal-content">
      <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
      <p>
        This will guide you to the position of the country on the map, but
        will terminate the current game. <br /><br />
        Are you sure?
      </p>
      <div class="options">
        <button
          class="map-modal-answer-positive fill-btn"
          id="country-positive"
        >
          <i class="fa-solid fa-thumbs-up fa-lg"></i> Yes
        </button>
        <button
          class="map-modal-answer-negative fill-btn"
          id="country-negative"
        >
          <i class="fa-solid fa-thumbs-down fa-lg"></i> No
        </button>
      </div>
    </div>
    `;

        if (modalName === "playAgainModal")
          html = `
        <div class="map-modal-content">
        <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
          <p>
            Don't give up yet! <br /><br />
            Try again
          </p>
          <button class="play-again-btn fill-btn" id="play-again">
            <i class="fa-solid fa-earth-europe fa-lg"></i> Play again
          </button>
        </div>
        `;

        if (modalName === "markerModal") {
          html = `
        <div class="map-modal-content">
        <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
        <h3>Create your map marker</h3>
        <span class="marker-info invisible">Now click on the map to set your marker!</span>
        <div class="marker-menu">
        <span class="marker-name-warning invisible">Marker must have a name</span>
          <label for="marker-name">Marker name:</label>
          <input
            type="text"
            class="marker-name"
            id="marker-name"
            placeholder="Marker name"
            maxlength="40"
          />
          </div>
          
          <div class="marker-btns">
            <button class="add-marker-btn fill-btn"><i class="fa-solid fa-location-crosshairs"></i> Add</button>
            <button class="remove-markers-btn fill-btn"><i class="fa-solid fa-dumpster-fire"></i> Remove all</button>
          </div>
      </div>
      `;
        }

        if (modalName === "timerModal")
          html = `
      <div class="map-modal-content">
      <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
      <div class="modal-timer-count">
        <h3>Gradually increase the challenge!</h3>
        <span class="timer-warning invisible">Please specify the time (at least 0:15)</span>
        <div class="input-timer">
          <input
            type="number"
            inputmode="numeric"
            class="timer-min"
            placeholder="min"
            value="${calcSavedtime()[0]}"
          />
          <span>:</span>
          <input
            type="number"
            inputmode="numeric"
            class="timer-sec"
            placeholder="sec"
            value="${calcSavedtime()[1]}"
          />
        </div>

        <button class="clear-time fill-btn">
        <i class="fa-solid fa-broom"></i> Clear 
        </button>
        <button class="save-time fill-btn">
        <i class="fa-solid fa-circle-check"></i> Save
        </button>
        <button class="start-timer fill-btn">
          <i class="fa-solid fa-clock"></i> Start
        </button>
      </div>
    </div>
        `;

        if (modalName === "settingsModal")
          html = `
      <div class="map-modal-content">
      <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
      <h3 class="settings-title">Settings ready to tweak!</h3>
      <div class="main-settings">
        <div class="audio-controls">
          <div class="audio-slider audio-music-slider">
            <i class="fa-solid fa-music"></i>
            <span class="audio-slider-text">Music Volume</span>
            <input
              type="range"
              class="audio-music-input"
              value="${this.#savedVol}"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
          <div class="audio-slider audio-effects-slider">
            <i class="fa-brands fa-soundcloud"></i>
            <span class="audio-slider-text">Sound Volume</span>
            <input
              type="range"
              class="audio-effects-input"
              value="${this.#savedVolEffects}"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>
        <!-- Switch buttons -->
        <div class="switch-btns">

          <div class="audio-switch switch-btn">
            <i
              class="fa-solid fa-volume-${
                switchSoundChecked === true ? "xmark" : "high"
              }"
            ></i>
            <span class="switch-audio-text switch-btn-text"
              >Sound ${switchSoundChecked === true ? "off" : "on"}</span
            >
            <input type="checkbox" class="audio-switch-btn"
            id="audio-switch" ${switchSoundChecked === true ? "checked" : ""} />
            <label for="audio-switch" class="switch">
              <span class="slider"></span>
            </label>
          </div>

          <div class="full-screen-switch switch-btn">
            <i
              class="fa-solid fa-${
                fullScreenChecked === true ? "expand" : "compress"
              }"
            ></i>
            <span class="switch-full-screen-text switch-btn-text"
              >
              Fullscreen ${fullScreenChecked === true ? "on" : "off"}
            </span
            >
            <input type="checkbox" class="full-screen-switch-btn"
            id="full-screen-switch" ${
              fullScreenChecked === true ? "checked" : ""
            } />
            <label for="full-screen-switch" class="switch">
              <span class="slider"></span>
            </label>
          </div>

          <div class="zoom-controls-switch switch-btn">
            <i
              class="fa-solid fa-magnifying-glass${
                zoomControlsOn === false ? "" : "-location"
              }"
            ></i>
            <span class="switch-zoom-controls-text switch-btn-text"
              >Zoom ${zoomControlsOn === false ? "off" : "on"}</span
            >
            <input type="checkbox" class="zoom-controls-switch-btn"
            id="zoom-controls-switch" ${
              zoomControlsOn === false ? "checked" : ""
            }/>
            <label for="zoom-controls-switch" class="switch">
              <span class="slider"></span>
            </label>
          </div>

          
          <div class="country-trivia-switch switch-btn">
          <i class="fa-solid fa-book${
            countryTriviaOn === true ? "-open" : ""
          }"></i>
            <span class="switch-country-trivia-text switch-btn-text"
              >Geo facts ${countryTriviaOn === true ? "on" : "off"}</span
            >
            <input type="checkbox" class="country-trivia-switch-btn"
            id="country-trivia-switch" ${
              countryTriviaOn === false ? "checked" : ""
            }/>
            <label for="country-trivia-switch" class="switch">
              <span class="slider"></span>
            </label>
          </div>
       
          <!-- Leave game btn -->
          <button class="leave-game-btn"><i class="fa-solid fa-door-open"></i> <span class="leave-game-text">Leave</span></button>
        </div>
      </div>
    </div>
      `;

        if (modalName === "guessedAll")
          html = `
           <div class="map-modal-content">
              <p>
                Wow, you've guessed all the countries! Start over again!
              </p>
              <button class="play-again-btn fill-btn" id="play-again">
                <i class="fa-solid fa-earth-europe fa-lg"></i> Play again
              </button>
            </div>
          `;

        this._showElement(countryFindModal);

        countryFindModal.insertAdjacentHTML("beforeend", html);
      }

      _colorizeSlider(slider) {
        const value =
          ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.background =
          "linear-gradient(to right, var(--light-dark-color) 0%, var(--light-dark-color) " +
          value +
          "%, var(--grey-color) " +
          value +
          "%, var(--grey-color) 100%)";

        return slider.style.background;
      }

      // Find country
      _findCountry(e) {
        // FIX
        // Swap label_y and label_x to properly center the country on the map - GeoJSON has lng, lat and Leaflet lat, lng

        const checkAnswer = (answer) =>
          e.target
            .closest("button")
            .classList.contains(`map-modal-answer-${answer}`);

        // To avoid classList null errors
        if (e.target.closest("button") === null) return;

        if (checkAnswer("positive")) {
          // Game finished
          this._gameFinished();
        }

        if (checkAnswer("negative")) {
          // Clear modal content
          this._clearElement(countryFindModal);
          this._hideElement(countryFindModal);
        }
      }

      // Reset GeoJSON
      _resetGeoJSON() {
        let countryName = this.#randomCountry;

        // remove all existing layers from the map
        this.geojson.eachLayer((layer) => {
          this.map.removeLayer(layer);
        });

        // add the updated GeoJSON layer with the green fill color for the correct country
        L.geoJSON(dataCountries, {
          style: function (feature) {
            if (feature.properties.name_en === countryName) {
              return {
                fillColor: "#29D605",
                fillOpacity: 0.5,
                color: "transparent",
              };
            } else {
              return {
                fillColor: "transparent",
                fillOpacity: 0,
                color: "transparent",
              };
            }
          },
        }).addTo(this.map);
      }

      _collapseMobileBtns() {
        // Collapse buttons for better clarity
        gameDetailBtns.classList.remove("mobile-collapsed");
        collapseBtn.classList.remove("collapse-on");
        buttonsContainer.classList.remove("buttons-container-on");
      }

      _flyToCountry() {
        let countryBounds = L.geoJSON(this.#randomCountryDetails).getBounds();
        let zoomLevel = this.map.getBoundsZoom(countryBounds);

        // Fly over to country's position
        this.map.flyTo(this.#countryCoords, zoomLevel, {
          animate: true,
          duration: 3,
        });
      }

      // Game finished
      _gameFinished() {
        this.#gameOver = true;

        // Get coords
        this.#countryCoords = [
          this.#randomCountryDetails.properties.label_y,
          this.#randomCountryDetails.properties.label_x,
        ];

        // Clear all previous markers
        this._deleteAllMarkers();

        // Create visible country tiles
        this._createTiles(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        );

        // Reset GeoJSON
        this._resetGeoJSON();

        // Fly to country's position
        this._flyToCountry();

        // Disable buttons
        this._disableBtns();

        // Disable timer if running
        if (timerLeft) {
          this._hideElement(timerLeft);

          clearInterval(this.#timerInterval);
        }

        // Create game over marker
        this._gameOverMarker();

        // Show play again modal
        this._openModal("playAgainModal");

        // Collapse mobile buttons
        this._collapseMobileBtns();
      }

      // Delete marker
      _deleteMarker(e) {
        // Add variable to store the popup content
        let popupContent;
        let tooltip;

        // Whem marker clicked, get the id and obj
        this.#marker.on("click", (e) => {
          const markerID = e.target._leaflet_id;
          this.#markers.find((marker, i) => {
            if (markerID === marker._leaflet_id) {
              this.#markerFound = marker;
              this.#markerIndex = i;
            }
          });
        });

        this.map.on("popupopen", (e) => {
          // Assign tooltip
          if (e.popup._source) {
            tooltip = e.popup._source._tooltip;
            if (tooltip) {
              // Hide tooltip
              tooltip.setOpacity(0);
            }
          }

          // Assign popup to variable
          popupContent = e.popup._contentNode;

          // Add event listener to the button in the popup content
          const removeMarkerButton =
            popupContent.querySelector(".remove-marker-btn");

          removeMarkerButton?.addEventListener("click", () => {
            this.#markers.find((marker) => {
              if (marker === this.#markerFound) {
                // // Hide tooltip
                // tooltip.setOpacity(0);
                // Remove marker layer and remove from array
                this.map.removeLayer(this.#markerFound);
                this.#markers.splice(this.#markerIndex, 1);
                removeMarkerButton?.removeEventListener("click", this);
              }
            });
          });
        });

        this.map.on("popupclose", (e) => {
          // Show tooltip when popup closed
          if (tooltip) {
            tooltip.setOpacity(1);
          }

          // Remove the event listener
          if (popupContent) {
            popupContent
              .querySelector(".remove-marker-btn")
              ?.removeEventListener("click", this);
          }
        });
      }

      // Delete all markers left on the map
      _deleteAllMarkers() {
        // Remove all existing markers
        for (let i = 0; i < this.#markers.length; i++) {
          // Remove layers from map
          this.map.removeLayer(this.#markers[i]);
        }

        // Empty the array
        this.#markers.length = 0;
      }

      // Set personal marker
      _setMarker(e) {
        const markerOptionBtn = e.target.closest("button");
        const addMarkerInput = document.querySelector(".marker-name");
        const markerInfo = document.querySelector(".marker-info");
        const markerNameWarning = document.querySelector(
          ".marker-name-warning"
        );
        const root = document.querySelector(":root");
        const mapEl = document.querySelector("#map");

        const markerBtn = document.querySelector(".marker-btn");
        const mapClueBtn = document.querySelector(".map-clue-btn");

        const isMarkerFilled =
          markerOptionBtn?.classList.contains("add-marker-btn") &&
          addMarkerInput.value !== "" &&
          !/^\s*$/.test(addMarkerInput.value);

        const isMarkerEmpty =
          (markerOptionBtn?.classList.contains("add-marker-btn") &&
            addMarkerInput.value === "") ||
          (markerOptionBtn?.classList.contains("add-marker-btn") &&
            /^\s*$/.test(addMarkerInput.value));

        // Show info
        const showMarkerInfo = () => {
          addMarkerInput.classList.remove("input-warning");
          this._showInvisible(markerInfo);
        };

        // Show warning
        const showMarkerWarning = () => {
          addMarkerInput.classList.add("input-warning");
          this._showInvisible(markerNameWarning);
        };

        // Hide warning
        const hideMarkerWarning = () => {
          addMarkerInput.classList.remove("input-warning");
          this._hideVisible(markerNameWarning);
        };

        const addMarker = (e) => {
          this.#popup = L.popup({
            className: "popup-custom",
          }).setContent(`
      <div class="marker-content">
        <div class="marker-name">${this.#markerName}</div>
        <button class="remove-marker-btn fill-btn"><i class="fa-solid fa-trash-can"></i></button>
      </div>
      `);

          const markerIcon = L.icon(this._customIcon());

          this.#marker = L.marker(e.latlng, { icon: markerIcon })
            .bindPopup(this.#popup)
            .addTo(this.map);

          const tooltip = L.tooltip({
            className: "popup-custom",
            direction: "left",
          }).setContent(this.#markerName);

          this.#marker.bindTooltip(tooltip).openTooltip();

          this._hideVisible(markerInfo);

          this._deleteMarker(e);

          this.map.off("click");

          markerBtn.classList.remove("marker-active");

          // Add geoJSON here to make sure the map returns to its original state each time the marker is set
          if (!mapClueBtn?.classList.contains("clue-on")) {
            this.map.addLayer(this.geojson);
          }

          // Reset inputs
          addMarkerInput.value = "";
          addMarkerInput.focus();

          // Set cursors to default
          root.style.setProperty("--cursor", "pointer");
          mapEl.classList.remove("set-marker-cursor");

          this.#markers.push(this.#marker);
        };

        if (addMarkerInput !== null) {
          this.#markerName = addMarkerInput.value;
          hideMarkerWarning();
        }

        // Add marker
        // If input not empty or only white space then proceed
        if (isMarkerFilled) {
          // Display info about operation
          showMarkerInfo();

          this._collapseMobileBtns();

          markerBtn.classList.add("marker-active");

          // Change cursor for marker placement
          root.style.setProperty("--cursor", "crosshair");
          mapEl.classList.add("set-marker-cursor");

          // Click on the map creates new marker
          this.map.on("click", addMarker);

          // Remove geoJSON && disable Remove All Btn for the duration of marker placement
          this.map.removeLayer(this.geojson);

          // If it is, show warning
        } else if (isMarkerEmpty) {
          showMarkerWarning();
        }

        if (
          e.target.closest("span")?.classList.contains("close-modal") &&
          !markerBtn.classList.contains("marker-active")
        ) {
          // Remove function when modal closed
          this.map.off("click");
        }

        if (markerOptionBtn?.classList.contains("remove-markers-btn")) {
          this._deleteAllMarkers();
        }
      }

      // Custom marker icon
      _customIcon() {
        return {
          iconUrl: "./media/images/marker.png",
          shadowUrl: "./media/images/marker-shadow.png",
          iconSize: [50, 70],
          iconAnchor: [20, 50],
          popupAnchor: [5, -25],
          tooltipAnchor: [-5, -25],
          shadowAnchor: [5, 26],
          shadowSize: [43, 30],
        };
      }

      // Create marker with popup
      _gameOverMarker() {
        const countryInfo = this._displayCountryInfo();

        countryInfo.then((info) => {
          // Display information in a popup
          const popup = L.popup({
            className: "popup-custom",
            autoPan: false,
          })
            .setContent(
              `<div class="popup-correct-info">
            <img class="popup-correct-img" src=${info.flagImg} alt="${
                info.flagAlt
              }">
          <p>You've found: <span>${this.#randomCountry}</span></p>
          <p><i class="fa-solid fa-building-columns"></i> Capital: <span>${
            info.capitalCity
          }</span></p>
          <p><i class="fa-solid fa-language"></i> Language: <span>${info.languages.join(
            ", "
          )}</span></p>
          <p><i class="fa-solid fa-people-roof"></i> Population: <span>${
            info.population
          }</span></p>
          <p><i class="fa-solid fa-money-bill-wave"></i> Currency: <span>${
            info.currencies
          }</span></p>
        </div>`
            )
            .setLatLng(this.#countryCoords)

            .openOn(this.map);

          const markerIcon = L.icon(this._customIcon());

          // Create marker
          const marker = L.marker(this.#countryCoords, {
            icon: markerIcon,
          })
            .bindPopup(popup)
            // First add to map, then openPopup() or you gonna end up with a popup overlapping the marker
            .addTo(this.map)
            .openPopup();
        });
      }

      // Guesses left (nav)
      _guessesLeft() {
        guessesLeftGame.textContent = this.#guessesLeft;
      }

      // Display score (nav)
      _displayScore() {
        scoreGame.textContent = this.#score;
      }

      // Display highscore (nav)
      _displayHighscore() {
        const highscoreSaved = JSON.parse(
          window.localStorage.getItem("highscoreSaved")
        );

        highscoreGame.textContent =
          highscoreSaved === null ? 0 : highscoreSaved;
      }

      // Settings control (modal)
      _settingsControl(e) {
        const hasEl = (cl) => e.target.classList.contains(cl);

        this.#audioSlider = document.querySelector(".audio-music-input");
        this.#audioEffectsSlider = document.querySelector(
          ".audio-effects-input"
        );
        const switchAudioBtn = document.querySelector(".audio-switch-btn");
        const switchFullscreenBtn = document.querySelector(
          ".full-screen-switch-btn"
        );
        const switchZoomBtn = document.querySelector(
          ".zoom-controls-switch-btn"
        );
        const switchCountryTriviaBtn = document.querySelector(
          ".country-trivia-switch-btn"
        );

        const btn = e.target;
        const btnClosest = e.target.closest("button");

        const setSwitchStyle = (el, text, icon) => {
          // Change switchFullscreenBtn text and icon when muted
          el.parentElement.querySelector(".switch-btn-text").textContent = text;

          el.parentElement.querySelector("i").className = icon;
        };

        const updateVolume = (elId, lsName, audio, slider, savedVol) => {
          if (hasEl(elId)) {
            this._colorizeSlider(slider);
            slider.setAttribute("value", audio.volume);
            audio.volume = slider.value;
            audio.muted = false;
            savedVol = audio.volume;

            window.localStorage.setItem(lsName, JSON.stringify(audio.volume));

            if (switchAudioBtn.checked === true) {
              audio.muted = true;
              this._colorizeSlider(slider);
              slider.setAttribute("value", audio.volume);
              audio.volume = slider.value;
              savedVol = audio.volume;
              return;
            }
          }
        };

        updateVolume(
          "audio-music-input",
          "audioVolume",
          this.#audio,
          this.#audioSlider,
          this.#savedVol
        );

        updateVolume(
          "audio-effects-input",
          "audioEffectsVolume",
          this.#audioEffects,
          this.#audioEffectsSlider,
          this.#savedVolEffects
        );

        if (this.#audioSlider === null && this.#audioEffectsSlider === null) {
          console.log("audio and effects sliders not found");
          return;
        }

        // Switch btns
        //  Sound switch
        if (
          btn.classList.contains("audio-switch") ||
          btn === switchAudioBtn ||
          btn.classList.contains("switch-audio-text")
        ) {
          // Mute audio
          switchAudioBtn.checked = !switchAudioBtn.checked;
          this.#audio.muted = switchAudioBtn.checked;

          // Update ls
          window.localStorage.setItem(
            "audioMusicMuted",
            JSON.stringify(this.#audio.muted)
          );

          // Change switchAudioBtn text and icon when muted
          // Mute audio effects
          this.#audioEffects.muted = switchAudioBtn.checked;

          // Update ls
          window.localStorage.setItem(
            "audioEffectsMuted",
            JSON.stringify(this.#audioEffects.muted)
          );

          // Change switchAudioBtn text and icon when muted
          setSwitchStyle(
            switchAudioBtn,
            "Sound off",
            "fa-solid fa-volume-xmark"
          );
        }

        // Change switchAudioBtn text and icon when not muted
        if (this.#audio.muted === false && this.#audioEffects.muted === false) {
          setSwitchStyle(switchAudioBtn, "Sound on", "fa-solid fa-volume-high");
        }

        // Fullscreen switch
        if (
          btn.classList.contains("full-screen-switch") ||
          btn === switchFullscreenBtn ||
          btn.classList.contains("switch-full-screen-text")
        ) {
          switchFullscreenBtn.checked = !switchFullscreenBtn.checked;

          const requestFullscreen =
            document.documentElement.requestFullscreen ||
            document.documentElement.mozRequestFullScreen ||
            document.documentElement.webkitRequestFullscreen ||
            document.documentElement.msRequestFullscreen;

          const exitFullscreen =
            document.exitFullscreen ||
            document.mozCancelFullScreen ||
            document.webkitExitFullscreen ||
            document.msExitFullscreen;

          if (requestFullscreen && !document.fullscreenElement) {
            setSwitchStyle(
              switchFullscreenBtn,
              "Fullscreen on",
              "fa-solid fa-expand"
            );

            document.documentElement.requestFullscreen();
          } else if (exitFullscreen && document.fullscreenElement) {
            setSwitchStyle(
              switchFullscreenBtn,
              "Fullscreen off",
              "fa-solid fa-compress"
            );

            document.exitFullscreen();
          }
        }

        // Zoom controls switch
        if (
          btn.classList.contains("zoom-controls-switch") ||
          btn === switchZoomBtn ||
          btn.classList.contains("switch-zoom-controls-text")
        ) {
          switchZoomBtn.checked = !switchZoomBtn.checked;

          setSwitchStyle(
            switchZoomBtn,
            "Zoom off",
            "fa-solid fa-magnifying-glass"
          );

          this.#zoomControlsVisible = false;
          this._hideVisible(zoomControls);

          window.localStorage.setItem(
            "zoomControlsVisible",
            JSON.stringify(this.#zoomControlsVisible)
          );
        }

        if (
          (btn.classList.contains("zoom-controls-switch") &&
            switchZoomBtn.checked === false) ||
          (btn.classList.contains("switch-zoom-controls-text") &&
            switchZoomBtn.checked === false)
        ) {
          this.#zoomControlsVisible = true;
          this._showInvisible(zoomControls);
          window.localStorage.setItem(
            "zoomControlsVisible",
            JSON.stringify(this.#zoomControlsVisible)
          );

          setSwitchStyle(
            switchZoomBtn,
            "Zoom on",
            "fa-solid fa-magnifying-glass-location"
          );
        }

        // Country trivia switch
        if (
          btn.classList.contains("country-trivia-switch") ||
          btn === switchCountryTriviaBtn ||
          btn.classList.contains("switch-country-trivia-text")
        ) {
          switchCountryTriviaBtn.checked = !switchCountryTriviaBtn.checked;

          this.#countryTrivia = false;

          setSwitchStyle(
            switchCountryTriviaBtn,
            "Geo facts off",
            "fa-solid fa-book"
          );

          window.localStorage.setItem(
            "countryTrivia",
            JSON.stringify(this.#countryTrivia)
          );
        }

        // Disable or enable country trivia popups
        if (
          (btn.classList.contains("country-trivia-switch") &&
            switchCountryTriviaBtn.checked === false) ||
          (btn.classList.contains("switch-country-trivia-text") &&
            switchCountryTriviaBtn.checked === false)
        ) {
          this.#countryTrivia = true;

          setSwitchStyle(
            switchCountryTriviaBtn,
            "Geo facts on",
            "fa-solid fa-book-open"
          );

          window.localStorage.setItem(
            "countryTrivia",
            JSON.stringify(this.#countryTrivia)
          );
        }

        // Leave game btn
        if (btnClosest?.classList.contains("leave-game-btn")) {
          this._loader(true, false);
        }
      }

      // Play again
      _playAgain(e) {
        const closeModalPresent =
          e.target.parentElement.classList.contains("close-modal");

        const playAgainBtnPresent =
          e.target.classList.contains("play-again-btn");

        if (playAgainBtnPresent) this._loader(true, false);

        if (closeModalPresent) {
          this._clearElement(countryFindModal);
          this._hideElement(countryFindModal);
        }
      }

      // Access saved time
      _getSavedTime() {
        const savedTime = JSON.parse(window.localStorage.getItem("savedTime"));

        if (savedTime === null) {
          return;
        }

        if (savedTime !== null) {
          return savedTime;
        }
      }

      // CalcTimer
      _calcTimer(min, sec) {
        if (sec < 10) {
          sec = `0${sec}`;
        }

        if (Number(min) === 0 && sec === "00") {
          // Game finished
          this._gameFinished();

          // Hide timer
          this._hideElement(timerLeft);
        }

        timerLeft.innerHTML = `<i class="fa-regular fa-clock"></i> ${min}:${sec}`;
      }

      _defineMinSec(min, sec) {
        // Minutes
        if (min.value.length > 1) {
          min.value = min.value.split("").splice(1, 1);
        }

        if (min.value >= 2) {
          min.value = 2;
          sec.value = "00";
        }

        // Seconds
        if (sec.value.length > 2) {
          sec.value = sec.value.split("").splice(2, 1);
        } else if (sec.value > 59) {
          min.value++;
        }

        if (sec.value > 59 && min.value < 2) {
          min.value = Math.floor(sec.value / 60);
          sec.value = sec.value % 60;
        }

        if (sec.value > 59 && min.value >= 2) {
          min.value = 2;
          sec.value = "00";
        }
      }

      // Set timer
      _setTimer(e) {
        const checkForEl = (elClass) => e.target.classList.contains(elClass);

        const checkForVal = (el) => !el.value;
        const checkForNum = (el) => Number(el) === 0;

        const clearTimer = (min, sec) => {
          if (checkForNum(min) && checkForNum(sec)) {
            clearInterval(this.#randomCountry);
          }
        };

        const checkInputType = () => {
          timerLeft.innerHTML = `<i class="fa-regular fa-clock"></i> ${
            this.#min
          }:${this.#sec}`;
          timerLeft.classList.add("input-time-active");
        };

        const showTimerWarning = () => {
          timerMin.classList.add("input-warning");
          timerSec.classList.add("input-warning");
          this._showInvisible(timerWarning);
        };

        const hideTimerWarning = () => {
          timerMin.classList.remove("input-warning");
          timerSec.classList.remove("input-warning");
          this._hideVisible(timerWarning);
        };

        const checkSavedTime = () => {
          if (Number(this.#sec) < 15 && Number(this.#min) === 0) {
            this.#sec = 15;

            timerSec.value = this.#sec;
          }
        };

        const timerBtn = document.querySelector(".timer-btn");
        const timerMin = document.querySelector(".timer-min");
        const timerSec = document.querySelector(".timer-sec");
        const timerWarning = document.querySelector(".timer-warning");

        if (timerMin === null) {
          return;
        }

        const isTimerProperValue =
          (checkForEl("start-timer") &&
            checkForVal(timerMin) &&
            checkForEl("start-timer") &&
            checkForVal(timerSec)) ||
          (checkForEl("start-timer") &&
            Number(timerMin.value <= 0) &&
            Number(timerSec.value < 15));

        // Input fields
        this.#min = timerMin.value;
        this.#sec = String(Math.trunc(timerSec.value % 60)).padStart(2, 0);

        // Calc and format time
        this._defineMinSec(timerMin, timerSec);

        const defineNewTime = () => {
          if (Number(this.#sec) >= 60 && Number(this.#min) < 2) {
            this.#min++;
            this.#sec = this.#sec % 60;
          }

          if (Number(this.#min) >= 2) {
            this.#min = 2;
            this.#sec = 0;
          }
        };

        // Start countdown timer
        this.#countDownTimer = () => {
          this.#sec--;

          if (Number(this.#sec) < 0) {
            this.#min--;
            this.#sec = 59;
          }

          defineNewTime();

          clearTimer(this.#min, this.#sec);

          this._calcTimer(this.#min, this.#sec);
        };

        // Minimum time allowed
        if (this.#min === "" && this.#sec === "00") {
          this.#min = 0;
          this.#sec = 10;
        }

        // Check if clear time btn pressed
        if (checkForEl("clear-time")) {
          timerMin.value = timerSec.value = "";

          window.localStorage.removeItem("savedTime");

          // Empty the array
          this.#savedTime ? (this.#savedTime.length = 0) : this.#savedTime;
        }

        // Check if save time btn pressed
        if (checkForEl("save-time")) {
          checkSavedTime();

          this.#savedTime = [this.#min, this.#sec];

          window.localStorage.setItem(
            "savedTime",
            JSON.stringify(this.#savedTime)
          );
        }

        // Time values are provided - start the timer
        if (isTimerProperValue) {
          // Display warning info
          showTimerWarning();

          return;
        } else {
          hideTimerWarning();
        }

        if (checkForVal(timerMin) && !checkForVal(timerSec)) {
          timerMin.value = 0;
        }

        if (checkForVal(timerSec) && !checkForVal(timerMin)) {
          timerSec.value = "00";
        }

        // Run timer
        // Convert time to nav timer and start counting down
        if (checkForEl("start-timer")) {
          this._showElement(timerLeft);

          this.#timerInterval = setInterval(this.#countDownTimer, 1000);

          checkInputType();

          // Disable timer modal
          this._hideElement(countryFindModal);

          this._disableBtn(timerBtn);
        }
      }

      // Stop timer
      _stopTimer(e) {
        const btn = e.target.closest("button");

        if (btn?.classList.contains("timer-stop-btn")) {
          clearInterval(this.#clueTimer);

          // Remove all layers but markers and popups
          this._removeTilesOnly();

          // Reverse layer removal effect
          this.map.addLayer(this.geojson);

          this._createTiles(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          );

          // Disable buttons for countDown duration
          this._enableBtns();

          // Hide timer
          this._hideElement(timerLeft);

          // Clear timer
          this._clearElement(timerLeft);

          // Render button unclickable
          this._disableBtn(this.#mapClueBtn);

          // Prevent set timer and counting down bug
          this.#mapClueBtn.classList.remove("counting-down");
        }
      }

      // Loader
      _loader(refresh = false, loadMap = false) {
        this._showElement(loader);
        this._hideElement(gameContainer);

        setTimeout(() => {
          this._hideElement(loader);
          this._showElement(gameContainer);

          // loadMap() must be here, otherwise blank map is displayed after the initial loading
          // this._loadMap();
          if (loadMap === true) this._loadMap();
        }, 2000);

        if (refresh === true) {
          // Less time in timeout means no flickering of map in the meantime
          setTimeout(() => location.reload(), 1800);
        }
      }

      // Set all modal functions such as pressing buttons and reloading the game
      _runModalActions(e) {
        this._findCountry(e);
        this._playAgain(e);
        this._setMarker(e);
        this._setTimer(e);
        this._settingsControl(e);
      }

      // Zoom controls
      _zoom(zoom) {
        zoom === "zoomIn" ? this.map.zoomIn() : this.map.zoomOut();
      }

      // Handle zoom on the map
      _handleZoom(e) {
        const btn = e.target.closest("button");
        const zoomIn = btn?.classList.contains("zoom-in-btn");
        const zoomOut = btn?.classList.contains("zoom-out-btn");

        // Changing zoom levels
        if (zoomIn) this._zoom("zoomIn");
        if (zoomOut) this._zoom("zoomOut");
      }

      // Disable all buttons
      _disableBtns() {
        gameDetailBtns.classList.add("unclickable");
      }

      // Enable all buttons
      _enableBtns() {
        gameDetailBtns.classList.remove("unclickable");
      }

      // Disable button
      _disableBtn(el) {
        el.classList.add("btn-off");
      }

      // Enable button
      _enableBtn(el) {
        el.classList.remove("btn-off");
      }

      // Clear modal content
      _clearElement(el) {
        el.innerHTML = "";
      }

      // Hide element
      _hideElement(el) {
        el.classList.add("hidden");
      }

      // Show element
      _showElement(el) {
        el.classList.remove("hidden");
      }

      // Show invisible element
      _showInvisible(el) {
        el.classList.remove("invisible");
      }

      // Hide visible element
      _hideVisible(el) {
        el.classList.add("invisible");
      }

      // Remove tiles only
      _removeTilesOnly() {
        this.map.eachLayer((layer) => {
          if (!(layer instanceof L.Marker) && !(layer instanceof L.Popup)) {
            this.map.removeLayer(layer);
          }
        });
      }

      // Handle button clicks
      _handleClicks(e) {
        const btn = e.target.closest("button");

        if (btn?.dataset === undefined) return;

        // Buttons
        this.#mapClueBtn = document.querySelector(".map-clue-btn");
        const markerBtn = document.querySelector(".marker-btn");

        // Reset marker placement if interrupted
        const resetMarkerFunc = () => {
          const markerInfo = document.querySelector(".marker-info");
          const root = document.querySelector(":root");
          const mapEl = document.querySelector("#map");
          this.map.off("click");
          this.map.addLayer(this.geojson);
          root.style.setProperty("--cursor", "pointer");
          mapEl.classList.remove("set-marker-cursor");
          markerBtn.classList.remove("marker-active");

          if (markerInfo) this._hideVisible(markerInfo);
        };

        // Modals
        const modalDataName = btn.dataset.modal;

        if (modalDataName) {
          this._openModal(modalDataName);
        }

        // Settings button
        if (btn.classList.contains("settings-btn")) {
          const root = document.querySelector(":root");
          const sliderMusicEl = document.querySelector(".audio-music-input");
          const sliderEffectsEl = document.querySelector(
            ".audio-effects-input"
          );
          root.style.setProperty(
            "--slider-gradient",
            this._colorizeSlider(sliderMusicEl),
            this._colorizeSlider(sliderEffectsEl)
          );
        }

        // If game is not over and theres other modal present, reset marker placement operation
        if (
          !btn.classList.contains("marker-active") &&
          !this.#mapClueBtn?.classList.contains("counting-down") &&
          this.#gameOver === false
        ) {
          resetMarkerFunc();
        }

        // Collapse on mobile
        if (btn.classList.contains("collapse-btn")) {
          gameDetailBtns.classList.toggle("mobile-collapsed");
          collapseBtn.classList.toggle("collapse-on");
          buttonsContainer.classList.toggle("buttons-container-on");
        }

        // Country's estimated position button
        let numX, numY, zoom;

        const estPositionDifficulty = () => {
          if (this.#difficulty === "easy") {
            numX = 2;
            numY = 2;
            zoom = 6;
          } else {
            numX = 5;
            numY = 25;
            zoom = 5;
          }
        };

        // Estimated poisition of country
        if (btn.classList.contains("est-position-btn")) {
          estPositionDifficulty();

          this.#randomCountryDetails = dataCountries.features.find(
            (country) =>
              country === dataCountries.features[this.#randomCountryI]
          );

          const countryCoordsRandom = [
            this.#randomCountryDetails.properties.label_y +
              Math.random() * numY,
            this.#randomCountryDetails.properties.label_x +
              Math.random() * numX,
          ];

          this.map.flyTo(countryCoordsRandom, zoom, {
            animate: true,
            duration: 1,
          });
        }

        // Map clue
        const mapClueOff = () => {
          this._removeTilesOnly();

          // Reverse layer removal effect
          this.map.addLayer(this.geojson);

          this._createTiles(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          );

          // ANTARCTICA
          this._loadAntarcitca();
        };

        const mapClueOn = () => {
          this._collapseMobileBtns();

          this._createTiles(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          );

          // Remove layer for map details & visibility
          this.map.removeLayer(this.geojson);

          btn.classList.toggle("clue-on");
        };

        if (btn.classList.contains("map-clue-btn")) {
          // Check map for clue
          const checkMapClue = (btnClass) => btn.classList.contains(btnClass);

          // Prevent set timer and counting down bug
          this.#mapClueBtn.classList.add("counting-down");

          if (checkMapClue("map-clue-btn")) {
            // Prevent set timer and counting down bug
            this.#mapClueBtn.classList.add("timer-on");

            let sec = this.#difficulty === "easy" ? 15 : 10;

            // Render button unclickable
            this._disableBtn(this.#mapClueBtn);

            // Show timer
            this._showElement(timerLeft);

            // Set timer element
            timerLeft.innerHTML = `<i class="fa-solid fa-eye"></i> 0:${sec} <button class="timer-stop-btn">
        <i class="fa-solid fa-xmark"></i></button>`;

            // Set timer bounding
            const countDown = () => {
              sec--;

              // Set timer element
              timerLeft.innerHTML = `<i class="fa-solid fa-eye"></i> 0:${
                sec < 10 ? 0 : ""
              }${sec} <button class="timer-stop-btn">
          <i class="fa-solid fa-xmark"></i></button>`;

              if (sec === 0) {
                mapClueOff();
                clearInterval(this.#clueTimer);

                // Disable buttons for countDown duration
                this._enableBtns();

                // Hide timer
                this._hideElement(timerLeft);

                // Clear timer
                this._clearElement(timerLeft);

                // Render button unclickable
                this._disableBtn(this.#mapClueBtn);

                // Prevent set timer and counting down bug
                this.#mapClueBtn.classList.remove("counting-down");
              }
            };

            this.#clueTimer = setInterval(countDown, 1000);

            if (countryFindModal) {
              this._hideElement(countryFindModal);
            }

            mapClueOn();
          } else return;

          if (!checkMapClue("clue-on")) {
            mapClueOff();
          }
        }
      }

      // Decrease guesses when wrong
      _guessesLeftDecrease() {
        this.#guessesLeft--;

        // Game is over if guesses reach 0
        if (this.#guessesLeft === 0) {
          this._gameFinished();
        }

        guessesLeftGame.textContent = this.#guessesLeft;
      }

      // Increase score when right
      _scoreIncrease() {
        this.#score++;

        scoreGame.textContent = this.#score;
      }

      // Increase highscore
      _highscoreIncrease() {
        if (this.#score > this.#highscore) this.#highscore = this.#score;

        highscoreGame.textContent = this.#highscore;

        window.localStorage.setItem(
          "highscoreSaved",
          JSON.stringify(this.#highscore)
        );
      }
    }

    const game = new GameState();
  })
  .catch((error) => {
    console.error("Error loading JSON file:", error);
  });
