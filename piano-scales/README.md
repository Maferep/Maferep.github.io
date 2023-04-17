# piano-scales
Webapp that guesses a musical scale for a melody based on notes played on a piano.

# Project priorities
1. ~~Layout of the app (done)~~
2. ~~Fill out the piano with actual stuff (that doesnt work)~~
3. ~~Make the piano work (basic note registering, console log)  (enable click based input of notes)~~
4. ~~store notes and display them prettily~~
9. ~~clearing notes~~
5. ~~Make the piano **play a sound**~~
6. ~~Enable computer keyboard input of notes~~
7. ~~"clear input" hotkeys/icons/repositioning~~
8. ~~highlight notes played _on_ the keyboard~~
    - ~~fix "clear last" highlight behavior~~
9. ~~Responsive layout~~
    - ~~force landscape~~
    - ~~handle limited space in notes and guesses~~
    - ~~prevent double-tap zoom~~
    - ~~svg buttons~~
    - *note: sizes are in rem, but font sizes are manually updated through
        media queries. it would have been neater to make a single relative
        layout and adjust the root element's font size to scale everything*
10. keep track of note frequencies
    1. show frequencies _on_ the keyboard
    2. highlight last three key presses with varying shininess level
11. steal sesamestreet.org styling
    - ~~pretty colors~~
    - color gradients
    - ~~round corners _everywhere_~~
12. actual application (guessing the note)
    - ~~distinguish major and minor scales in code and UI~~
    - ~~remove major/minor switch~~
    - make imperfect guesses (stretch goal)
    - display goodness of fit (stretch goal)  
      note: off-key notes are a little bit of spice, so they are less *frequent*
      than on-key notes. if the user plays 20 notes all in C# and one note that
      doesn't fit, it makes sense to still be pretty confident the song is in C#

## Tests
Temporary:run test.html and check that get_scale's output is the same as 'check' variable in prerender.js
