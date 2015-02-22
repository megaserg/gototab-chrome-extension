# gototab
Chrome extension analogous to Sublime/Atom Command Palette.

## Install
- Go to Chrome hamburger menu &#8594; More tools &#8594; Extensions or directly `chrome://extensions`
- Check Developer mode checkbox
- Click "Load unpacked extension..." and choose gototab directory

## Usage
- Press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> on Mac (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> on PC) to bring up the popup
- Type the search term
- (Optionally) Press <kbd>Up</kbd>/<kbd>Down</kbd> to move the highlighting
- Press Enter. The highlighted tab should become active.

To customize the shortcut, go to `chrome://extensions`, scroll to the bottom and click "Keyboard shortcuts".

## TODO
- Proper MVC in JS
- Support [fuzzy search](http://en.wikipedia.org/wiki/Approximate_string_matching#Problem_formulation_and_algorithms)
- Tweak colors
- Make the popup appear in the center of the screen (?)
