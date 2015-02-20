/////////////////////////
// View functions
/////////////////////////

// TODO: these functions should be inside one View object.

var getSearchInput = function() {
  return document.getElementById("searchInput");
};

var getTabListDiv = function() {
  return document.getElementById("tabListDiv");
};

var setFocusOnInput = function() {
  getSearchInput().focus();
};

var displayTabsHtml = function(html) {
  getTabListDiv().innerHTML = html;
};

var gotoTab = function(tab) {
  chrome.tabs.update(tab.id, {active: true});
  chrome.windows.update(tab.windowId, {focused: true});
};

/////////////////////////
// View helpers
/////////////////////////

var renderTabsToHtml = function(tabs, highlightedTabIndex) {
  var n = tabs.length;

  var listHtml = "";
  for (var i = 0; i < n; i++) {
    listHtml += "<div" + (i == highlightedTabIndex ? " class='highlighted'" : "") + ">";
    listHtml += "<img src='" + tabs[i].favIconUrl + "' class='favicon' />";
    listHtml += "<span class='title'>" + tabs[i].title + "</span>";
    listHtml += "<br />";
    listHtml += "<span class='url'>" + tabs[i].url + "</span>";
    listHtml += "</div>";
  }

  return listHtml;
};

var refreshView = function() {
  displayTabsHtml(renderTabsToHtml(tabsToDisplay, highlightedTabIndex));
};


/////////////////////////
// Model
/////////////////////////

/*
 * TODO: ideally, model should not be calling refreshView, but rather
 * broadcast an event "I, model, have changed". Controller should listen
 * to this event and update view whenever it comes.
 */
var model = {
  // private

  tabsToDisplay: [],

  highlightedTabIndex: 0,

  isValidIndex: function(index) {
    return 0 <= index && index < tabsToDisplay.length;
  },

  // public

  hasTabs: function() {
    return tabsToDisplay.length > 0;
  },

  setTabsToDisplay: function(tabs) {
    tabsToDisplay = tabs;
    highlightedTabIndex = 0;
    refreshView();
  },

  decrementIndexIfPossible: function() {
    if (this.hasTabs() && this.isValidIndex(highlightedTabIndex - 1)) {
      highlightedTabIndex--;
      refreshView();
    }
  },

  incrementIndexIfPossible: function() {
    if (this.hasTabs() && this.isValidIndex(highlightedTabIndex + 1)) {
      highlightedTabIndex++;
      refreshView();
    }
  },

  getHighlightedTab: function() {
    if (this.hasTabs() && this.isValidIndex(highlightedTabIndex)) {
      return tabsToDisplay[highlightedTabIndex];
    }
  },
};

/////////////////////////
// Business logic
/////////////////////////

/**
 * Gets all tabs.
 *
 * @param {function(array[Tab])} processTabs
 *   Called with the list of tabs.
 */
var asyncGetTabs = function(processTabs) {
  var queryInfo = {
    // To limit the search to the current window, uncomment the following line.
    // currentWindow: true
  };

  chrome.tabs.query(queryInfo, processTabs);
};

var filterTabs = function(tabs, query) {
  var containsCaseInsensitive = function(substring) {
    var lowercaseSubstr = substring.toLowerCase();
    return function(string) {
      return string.toLowerCase().indexOf(lowercaseSubstr) != -1;
    };
  };

  var containsQuery = containsCaseInsensitive(query);

  var predicate = function(tab) {
    return containsQuery(tab.title) || containsQuery(tab.url);
  };

  return tabs.filter(predicate);
};

/////////////////////////
// Controller functions
/////////////////////////

/**
 * Wires up the functions to react on the input.
 *
 * @param {InputHTMLElement} input
 *   Input element to react on.
 * @param {function(event)} processKeyDown
 *   Called when user pushes the key.
 * @param {function(event)} processKeyUp
 *   Called when user releases the key.
 */
var wireInputListeners = function(input, processKeyDown, processKeyUp) {
  input.addEventListener("keydown", processKeyDown, false);
  input.addEventListener("keyup", processKeyUp, false);
};

var getMapping = function(map, key) {
  var value = map[key];
  if (typeof value == "undefined") {
    value = map["default"];
  }
  return value;
};

// TODO: have "all tabs" in the model?
var wireInput = function(tabs) {
  var processInput = function(event) {
    var query = getSearchInput().value;
    model.setTabsToDisplay(filterTabs(tabs, query));
  };

  var processEnter = function(event) {
    if (model.hasTabs()) {
      gotoTab(model.getHighlightedTab());
    }
  };

  var processUpArrow = function(event) {
    model.decrementIndexIfPossible();
  };

  var processDownArrow = function(event) {
    model.incrementIndexIfPossible();
  };

  var invokeByKeymap = function(keymap) {
    return function(event) {
      var handler = getMapping(keymap, event.keyCode);
      if (handler) {
        handler(event);
      }
    };
  };

  var processEdit = invokeByKeymap({
    13: null, // Enter key
    38: null, // Up arrow key
    40: null, // Down arrow key
    "default": processInput,
  });

  var processFunctionalKeys = invokeByKeymap({
    13: processEnter, // Enter key
    38: processUpArrow, // Up arrow key
    40: processDownArrow, // Down arrow key
    "default": null,
  });

  // For keys like Enter and arrows, keydown feels more responsive.
  // For character keys, keyup should be used so that text field value is changed.
  wireInputListeners(getSearchInput(), processFunctionalKeys, processEdit);
};

var processTabs = function(allTabs) {
  model.setTabsToDisplay(allTabs);

  wireInput(allTabs);

  setFocusOnInput();
};

var onContentLoaded = function() {
  asyncGetTabs(processTabs);
};

document.addEventListener("DOMContentLoaded", onContentLoaded);
