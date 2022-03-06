const toggleMenu = document.querySelector(".toggler__menu");
const menu = document.querySelector(".menu");
const closeMenuBtn = document.querySelector(".close__menu--btn");
const menuOverlay = document.querySelector(".menu__overlay");
const modalOverlay = document.querySelector(".modal__overlay");
const modalElem = document.querySelector(".modal");
const modalClose = document.querySelector(".modal i.fa-close");
const modalContent = document.querySelector(".modal__content p");
const modalDetailElem = document.querySelector(".modal__info");
const modalDetailBtn = document.querySelector(".modal_datail_close");
const aboutAppBtn = document.querySelector(".about__app");

//form selection
const workouContainer = document.querySelector(".workouts__container");
const form = document.querySelector(".form");
const distanceInput = document.querySelector(".distance__input");
const durationInput = document.querySelector(".duration__input");
const cadenceInput = document.querySelector(".cadence__input");
const elevationInput = document.querySelector(".elevation__input");
const typeInput = document.querySelector("#type_workout");
const locale = "fa-IR";
/* 
    const mounth = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    this.description = `${
      this.type === "running" ? "دویدن" : "دوچرخه سواری"
    } در ${mounth[this.date.getMonth()]} ${this.date.getDate()}`;
*/

//
class Workout {
  //
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const optionsDate = {
      hour: "numeric",
      minute: "numeric",
      day: "numeric",
      month: "long",
      year: "numeric",
    };

    //prettier-ignore
    const formatedDate = new Intl.DateTimeFormat(locale, optionsDate).format(this.date);

    this.description = `${
      this.type === "running" ? "دویدن" : "دوچرخه سواری"
    } در ${formatedDate}`;
  }
}

class Running extends Workout {
  //
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  //
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

class App {
  //define variables
  #map;
  #mapEvent;
  #mapMarkerArray = [];
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    //Get user position
    this._getPosition();

    //get from localStorage data
    this._getLocalStorage();

    // set value of select input of type
    typeInput.value = "running";

    // set events
    //form submit
    form.addEventListener("submit", this._newWorkout.bind(this));
    //prettier-ignore
    workouContainer.addEventListener("click", this._moveToPopup.bind(this));
    //prettier-ignore
    workouContainer.addEventListener("click",this._workoutElemEventhandler.bind(this));

    // select chande & toggle inputs
    typeInput.addEventListener("change", this._toggleElevationField);
    // menu handler
    toggleMenu.addEventListener("click", this._toggleMenuHandler);
    menuOverlay.addEventListener("click", this._toggleMenuHandler);
    closeMenuBtn.addEventListener("click", this._toggleMenuHandler);
    //modal close
    modalClose.addEventListener("click", this._modalClose);
    modalDetailBtn.addEventListener("click", this._modalDetailClose);

    aboutAppBtn.addEventListener(
      "click",
      this._modalHandler.bind(this, modalDetailElem)
    );

    modalOverlay.addEventListener("click", this._modalDetailClose);
    //prettier-ignore
    document.addEventListener("keydown", function (e) {if (e.key === "Escape") this._toggleMenuHandler(); }.bind(this));
  }

  _newWorkout(e) {
    //helper func
    //prettier-ignore
    const validInputs = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
    const isAllPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data of form
    const type = typeInput.value;
    const distance = +distanceInput.value;
    const duration = +durationInput.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    let elevation;
    let cadence;

    if (type === "running") {
      cadence = +cadenceInput.value;

      //gard
      // prettier-ignore
      if ( !validInputs(distance, duration, cadence) || !isAllPositive(distance, duration, cadence))
        return this._modalHandler(modalElem);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === "cycling") {
      elevation = +elevationInput.value;

      // Gard
      // prettier-ignore
      if ( !validInputs(distance, duration, elevation) || !isAllPositive(distance, duration)) 
      return this._modalHandler(modalElem);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //if flag is true => means the workout edited
    let flag = false;

    this.#workouts.some((work, index) => {
      if (work.coords.includes(workout.coords[0])) {
        workout = work;
        this.#workouts.splice(index, 1);
        this.#map.removeLayer(this.#mapMarkerArray[index]);
        this.#mapMarkerArray.splice(index, 1);

        flag = true;
        return;
      }
    });

    if (flag) {
      // prettier-ignore
      if (type === "running") workout = new Running([lat, lng], distance, duration, cadence);
      // prettier-ignore
      if (type === "cycling") workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // console.log(workout.type);

    // push to array
    this.#workouts.push(workout);

    // render markout

    this._renderworkoutMarker(workout);

    //render workout on the list
    this._renderWorkout(workout, flag);

    //hide form
    this._hideForm();
    this._toggleMenuHandler();

    // set localStorage
    this._setLocalStorag();
  }

  _workoutElemEventhandler(e) {
    //Gard
    if (!this.#map) return;
    //remove
    if (e.target.className === "fa fa-trash") {
      const deleteItem = e.target.closest(".workout");
      // const form = workouContainer.firstElementChild;

      //prettier-ignore
      const deleteIndex = this.#workouts.findIndex(workout => workout.id === deleteItem.dataset.id);

      this.#workouts.splice(deleteIndex, 1);

      // renders remain workout
      this.append(workouContainer, this.#workouts);

      // update localstorage
      this._setLocalStorag();

      //delete marker
      this.#map.removeLayer(this.#mapMarkerArray[deleteIndex]);
      this.#mapMarkerArray.splice(deleteIndex, 1);
    }

    //change
    if (e.target.className === "fa fa-edit") {
      form.classList.remove("hidden");

      const index = e.target.closest(".workout");

      //prettier-ignore
      const itemEditIndex = this.#workouts.findIndex(workout => workout.id === index.dataset.id);
      // const itemEditIndex = this.#workouts.find(editWork => editWork.id === deleteItem.dataset.id);

      this.#mapEvent = this.#mapMarkerArray[itemEditIndex];
      this.#mapEvent.latlng = this.#mapEvent._latlng;
    }
  }

  _getPosition() {
    if (navigator.geolocation) {
      //prettier-ignore
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), geoError.bind(this));
    }
    //Error handler
    function geoError() {
      modalContent.textContent = `دسترسی به موقعیت مکانی ممکن نیست!`;
      this._modalHandler(modalElem);
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling mark on map
    this.#map.on("click", this._showForm.bind(this));

    // render markers
    this.#workouts.forEach((work) => this._renderworkoutMarker(work));
  }

  _renderworkoutMarker(workout) {
    const options = {
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    };
    let newMarker = L.marker(workout.coords, { draggable: true })
      .addTo(this.#map)
      .bindPopup(L.popup(options))
      .setPopupContent(`${workout.description}`)
      .openPopup();

    newMarker.on("dragend", this._newCoordsMarker.bind(this, workout));
    this.#mapMarkerArray.push(newMarker);
  }

  _newCoordsMarker(workout, e) {
    const { lat: newLat, lng: newLng } = e.target._latlng;
    const newCoords = [newLat, newLng];

    //set new coords
    this.#workouts.forEach((newWorkMark) => {
      if (workout.id === newWorkMark.id) {
        newWorkMark.coords = newCoords;
      }
    });
    this._setLocalStorag();
  }

  _renderWorkout(workout, flag = false) {
    // if the workout is edited replace the new to
    if (flag) {
      this.append(workouContainer, this.#workouts);
    } else {
      this._workoutGenerator(workout);
    }
  }

  append(ItemContainer, workoutArray) {
    const form = workouContainer.firstElementChild;
    ItemContainer.innerHTML = "";
    ItemContainer.appendChild(form);

    workoutArray.forEach((work) => this._workoutGenerator(work));
  }

  _workoutGenerator(workout) {
    let html = `
    <li class="workout workout__${workout.type}" data-id="${workout.id}">
      <a href="#" class="workout__del"><i class="fa fa-trash"></i></a>
      <a href="#" class="workout__change"><i class="fa fa-edit"></i></a>
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__detail">
        <span class="workou_unit">km</span>
        <span class="workou_value">${workout.distance}</span>
        <span class="workou_icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚲"
        }</span>
      </div>
      <div class="workout__detail">
        <span class="workou_unit">MIN</span>
        <span class="workou_value">${workout.duration}</span>
        <span class="workou_icon">⌚</span>
      </div>
    `;

    if (workout.type === "running") {
      html += `
          <div class="workout__detail">
          <span class="workou_unit">MIN/KM</span>
          <span class="workou_value">${workout.pace.toFixed(1)} </span>
          <span class="workou_icon">⚡</span>
        </div>
        <div class="workout__detail">
          <span class="workou_unit">SPM</span>
          <span class="workou_value">${workout.cadence} </span>
          <span class="workou_icon">👣</span>
        </div>
      </li>
      `;
    }

    if (workout.type === "cycling") {
      html += `
          <div class="workout__detail">
          <span class="workou_unit">KM/H</span>
          <span class="workou_value">${workout.speed.toFixed(1)}</span>
          <span class="workou_icon">⚡</span>
        </div>
        <div class="workout__detail">
          <span class="workou_unit">M</span>
          <span class="workou_value">${workout.elevationGain}</span>
          <span class="workou_icon">🗻</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    //Gard
    if (!this.#map) return;

    const workouElem = e.target.closest(".workout");

    if (!workouElem) return;

    const workoutClicked = this.#workouts.find(
      (work) => work.id === workouElem.dataset.id
    );

    if (!workoutClicked) return;

    const setViewOptions = {
      animate: true,
      pan: { duration: 1 },
    };
    //prettier-ignore
    this.#map.setView(workoutClicked.coords, this.#mapZoomLevel, setViewOptions);
  }

  //localStorage set & get
  _setLocalStorag() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const allData = JSON.parse(localStorage.getItem("workouts"));

    if (!allData) return;

    allData.forEach((data) => {
      if (data.type === "running") Object.setPrototypeOf(data, Running);
      if (data.type === "cycling") Object.setPrototypeOf(data, Cycling);
    });

    this.#workouts = allData;
    this.#workouts.forEach((work) => this._renderWorkout(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    durationInput.focus();
    this._toggleMenuHandler();
  }

  _hideForm() {
    //prettier-ignore
    distanceInput.value = durationInput.value = elevationInput.value = cadenceInput.value = '';
    form.classList.add("hidden");
  }

  _toggleMenuHandler() {
    menu.classList.toggle("menu__isActive");
    menuOverlay.classList.toggle("overlay--active");
  }

  _toggleElevationField() {
    elevationInput.closest(".form__row").classList.toggle("form__row_hidden");
    cadenceInput.closest(".form__row").classList.toggle("form__row_hidden");
  }

  _modalHandler(modalElement) {
    modalElement.classList.remove("hidden_modal");
    modalOverlay.classList.add("overlay--active");

    if (modalElement.classList.contains("modal"))
      setTimeout(() => {
        modalElement.classList.add("hidden_modal");
        modalOverlay.classList.remove("overlay--active");
      }, 5000);
  }

  _modalClose() {
    modalElem.classList.add("hidden_modal");
  }
  _modalDetailClose() {
    modalDetailElem.classList.add("hidden_modal");
    modalOverlay.classList.remove("overlay--active");
  }
}

const app = new App();
