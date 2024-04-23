window.addEventListener("load", () => {
    app = new App(document.getElementById("app"));
});

/* ~~~~~~~~~~ BUSINESS LOGIC ~~~~~~~~~~ */
class App {
    /* appslot is the <div> where the app will be slotted into.
        requires descendants with id "piano", "controls", etc */
    constructor(appslot) {
        this.guesser = new KeyGuesser();
        this.synth = new KeyboardSynth();
        this.ui = new AppUI(appslot);
        this.ui.subscribe("note", this.playnote.bind(this));
        this.ui.subscribe("clear_all", this.clear_all.bind(this));
        this.ui.subscribe("clear_last", this.clear_last.bind(this));
        this.ui.subscribe("help", this.show_help.bind(this));
        this.ui.subscribe("grayout", this.hide_help.bind(this));
    }

    playnote(note, _octave) {
        this.guesser.add_note(note, _octave);
        this.synth.playnote(note, _octave);
        this._update_guesser_view();
        this.ui.set_highlight(note, _octave);
    }

    clear_all() {
        this.guesser.clear_all();
        this._update_guesser_view();
        this.ui.clear_highlights();
    }

    clear_last() {
        this.guesser.clear_last();
        this._update_guesser_view();
        this.ui.clear_highlights();
        for (const [note, _octave] of new Set(this.guesser.note_history))
            this.ui.set_highlight(note, _octave);
    }

    show_help() {
        this.ui.show_popup();
    }

    hide_help() {
        this.ui.hide_popup();
    }

    _update_guesser_view() {
        this.ui.guesslist_replace(this.guesser.guesses);
        this.ui.notelist_replace(this.guesser.notes.map(x => octave.notes[x % 12]));
    }
}

class AppUI {
    /* appslot is the <div> where the app will be slotted into.
        requires descendants with id "piano", "controls", etc */
    constructor(appslot) {
        // DOM elements, which allow putting stuff on the screen
        /* TODO: make piano et al CSS classes instead of ids
            we can only get elements by id from document */
        this._slot_element = appslot;
        this._piano_element = document.getElementById("piano");
        this._guess_list_element = document.getElementById("guess_list");
        this._note_list_element = document.getElementById("note_list");
        this._help_popup_element = document.getElementById("help_grayout");

        this._callbacks = new Map();

        // inner representations of what should be on the screen
        this._guess_list = [];
        this._note_list = [];

        this._guess_list_element.max_height= document.documentElement.clientWidth ;

        for (let i = 0; i < 24; i++) {
            const key = document.createElement("button");
            const note = i % octave.notes.length;
            const _octave = Math.floor(i / octave.notes.length);
            key.classList.add(`${octave.keycolors[note]}key`); // black or white?
            key.addEventListener("click", () => this._emit("note", note, _octave));
            this._piano_element.appendChild(key);
        }
 
        window.addEventListener("keydown", e => {
            if (e.code == "Backspace") {
                this._emit("clear_last");
                return;
            }

            if (e.code == "Escape") {
                this._emit("clear_all");
                return;
            }

            const keys = "AWSEDFTGYHUJKOLP".split("").map(c => "Key"+c);
            const i = keys.indexOf(e.code);
            if (i == -1) return;

            const note = i % octave.notes.length;
            const _octave = Math.floor(i / octave.notes.length);
            this._emit("note", note, _octave);
        });

        document.getElementById("clear_all").addEventListener("click", () => {
            this._emit("clear_all");
        });
        document.getElementById("clear_last").addEventListener("click", () => {
            this._emit("clear_last");
        });
        document.getElementById("help").addEventListener("click", () => {
            this._emit("help");
        });
        document.getElementById("help_grayout").addEventListener("click", () => {
            this._emit("grayout");
        });
    }

    subscribe(eventname, callback) {
        if (!this._callbacks.has(eventname))
            this._callbacks.set(eventname, []);
        const l = this._callbacks.get(eventname);
        l.push(callback);
    }

    _emit(eventname, ...args) {
        const l = this._callbacks.has(eventname)
            ? this._callbacks.get(eventname)
            : [];
        for (const callback of l)
            callback(...args);
    }

    notelist_replace(notes) {
        this._note_list = notes;
        let note_elements = [];
        for (const note of notes) {
            let note_elem = document.createElement("div");
            note_elem.classList.add("note");
            note_elem.textContent = note;
            note_elements.push(note_elem);
        }
        this._note_list_element.replaceChildren(...note_elements);
    }

    guesslist_replace(guesses) {
        this._guess_list = guesses;
        let guess_elements = [];
        for (const guess of guesses) {
            let guess_elem = document.createElement("div");
            guess_elem.classList.add("guess_small");
            guess_elem.textContent = guess;
            guess_elements.push(guess_elem);
        }
        this._guess_list_element.replaceChildren(...guess_elements);
    }

    get highlights() {
        return Array.from(this._piano_element.children)
            .map(e => e.classList.contains("highlightkey"));
    }

    set_highlight(note, _octave) {
        this._piano_element.children[note + 12*_octave].classList.add("highlightkey");
    }

    unset_highlight(note, _octave) {
        this._piano_element.children[note + 12*_octave].classList.remove("highlightkey");
    }

    show_popup() {
        this._help_popup_element.style.visibility = "visible";
    }

    hide_popup() {
        this._help_popup_element.style.visibility = "hidden";
    }

    clear_highlights() {
        const len = this._piano_element.childElementCount;
        for (let i = 0; i < len; i++)
            this._piano_element.children[i].classList.remove("highlightkey");
    }
}

// this keyguesser does not care about octaves and will shed octave information
// all it has is ids from 0 to 11 representing semitones from the note C to the note B
class KeyGuesser {
    // notes input by the user
    note_history = [];

    // guesses output by this guesser, in numeric format
    guesses = [];

    // subscribers to changes to the guesslist and notelist
    callbacks = [];

    constructor() {
        /* list all scales (major and minor, for every note) and the notes
            that make them up */
        this._scales = new Map();
        for (const note of octave.notes) {
            // major key
            this._scales.set(`${ note }M`, get_scale_ids(note, scales.major));
            // minor key
            this._scales.set(`${ note }m`, get_scale_ids(note, scales.minor));
        }
    }

    get notes() {
        const notes_played = new Set(
            this.note_history.map(([note, _octave]) => note));
        return Array.from(notes_played);
    }

    clear_all() {
        this.note_history.length = 0;
        this.update_guesses();
    }

    clear_last() {
        this.note_history.pop();
        this.update_guesses();
    }

    add_note(note, _octave) {
        this.note_history.push([note, _octave]);
        this.update_guesses();
    }

    update_guesses() {
        if (!this.notes.length) {
            this.guesses = [];

        } else {
            // keep scales which include every note in the note history
            this.guesses = Array.from(this._scales.keys()).filter(scale =>
                this.notes.every(note => this._scales.get(scale).includes(note)));
        }
    }

    
}

class KeyboardSynth {
    constructor() {
        this.samples = note_files
            .map(note => `../assets/mp3 Notes/${note}`)
            .map(path => new Audio(path));
    }

    playnote(note, _octave) {
        let sample = this.samples[note + 12 * _octave];
        sample.currentTime = 0; // TODO: address delay in audio library
        sample.play();
    }
}


/* ~~~~~~~~~~ Business Logic: Scale calculations ~~~~~~~~~~ */

// TODO: dont perform this calculation at runtime!

// start_note: the note at which the scale starts (A#)
// distances_to_start: sequence of 7 numbers from 0 to 11 denoting the distance 
//     of each note (in semitones) to the start_note
//     (used to represent the general structure for major and minor scales)

function get_scale_ids(start_note, distances_to_start) {
    let offset = octave.notes.indexOf(start_note);
    let my_scale = distances_to_start
        .map(x => (x + offset) % octave.notes.length);
    return my_scale;
}

const assert = function(condition, message) {
    if (!condition)
        throw Error('Assert failed: ' + (message || ''));
};

const assertArrayEquals = function(arr1, arr2, message) {
    for (let step = 0; step < Math.min(arr1.length, arr2.length); step++) {
        assert(arr1[step] == arr2[step], message)
    }
};


/* ~~~~~~~~~~ GLOBALS ~~~~~~~~~~ */
let app;    // initialized on load

const octave = {
    keycolors: [
        "white", "black", "white", "black", "white",
        "white", "black", "white", "black", "white", "black", "white" ],
    notes: [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ],
}

const note_files = [
    "c3.mp3", "c-3.mp3", "d3.mp3", "d-3.mp3", "e3.mp3", "f3.mp3", "f-3.mp3", "g3.mp3", "g-3.mp3", "a4.mp3", "a-4.mp3", "b4.mp3",
    "c4.mp3", "c-4.mp3", "d4.mp3", "d-4.mp3", "e4.mp3", "f4.mp3", "f-4.mp3", "g4.mp3", "g-4.mp3", "a5.mp3", "a-5.mp3", "b5.mp3",
    "c5.mp3", "c-5.mp3", "d3.mp3", "d-5.mp3", "e5.mp3", "f5.mp3", "f-5.mp3", "g5.mp3", "g-5.mp3", "a5.mp3", "a-6.mp3", "b6.mp3" ];

const scales = {"major":[0,2,4,5,7,9,11], "minor": [0,2,3,5,7,8,10] };
