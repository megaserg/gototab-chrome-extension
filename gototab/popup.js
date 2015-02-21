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

  var emphasize = function(str, indices) {
    var res = "";

    var n = str.length;
    var m = indices.length;

    var start = 0;
    for (var j = 0; j < m; j++) {
      res += str.substring(start, indices[j][0]);
      res += "<b>";
      res += str.substring(indices[j][0], indices[j][1]);
      res += "</b>";
      start = indices[j][1];
    }
    res += str.substring(start, n);

    return res;
  };

  var n = tabs.length;

  var listHtml = "";
  for (var i = 0; i < n; i++) {
    var tab = tabs[i].tab;
    var titleIndices = tabs[i].titleIndices;
    var urlIndices = tabs[i].urlIndices;

    listHtml += "<div" + (i == highlightedTabIndex ? " class='highlighted'" : "") + ">";
    listHtml += "<img src='" + tab.favIconUrl + "' class='favicon' />";
    listHtml += "<span class='title'>" + emphasize(tab.title, titleIndices) + "</span>";
    listHtml += "<br />";
    listHtml += "<span class='url'>" + emphasize(tab.url, urlIndices) + "</span>";
    listHtml += "</div>";
  }

  return listHtml;
};

var refreshView = function() {
  displayTabsHtml(renderTabsToHtml(model.tabsToDisplay, model.highlightedTabIndex));
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
    return 0 <= index && index < this.tabsToDisplay.length;
  },

  // public

  hasTabs: function() {
    return this.tabsToDisplay.length > 0;
  },

  setTabsToDisplay: function(tabs) {
    this.tabsToDisplay = tabs;
    this.highlightedTabIndex = 0;
    refreshView();
  },

  decrementIndexIfPossible: function() {
    if (this.hasTabs() && this.isValidIndex(this.highlightedTabIndex - 1)) {
      this.highlightedTabIndex--;
      refreshView();
    }
  },

  incrementIndexIfPossible: function() {
    if (this.hasTabs() && this.isValidIndex(this.highlightedTabIndex + 1)) {
      this.highlightedTabIndex++;
      refreshView();
    }
  },

  getHighlightedTab: function() {
    if (this.hasTabs() && this.isValidIndex(this.highlightedTabIndex)) {
      return this.tabsToDisplay[this.highlightedTabIndex];
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

var createTabWithIndices = function(tab, titleIndices, urlIndices) {
  return {
    "tab": tab,
    "titleIndices": titleIndices,
    "urlIndices": urlIndices,
  };
};

var addEmptyIndices = function(tabs) {
  return tabs.map(function(tab) {
    return createTabWithIndices(tab, [[0, 0]], [[0, 0]]);
  });
};

var filterTabs = function(tabs, query) {
  var indicesCaseInsensitive = function(substring) {
    // Workaround for empty search term
    if (substring.length == 0) {
      return function(string) {
        return [[0, 0]];
      };
    }

    substring = substring.toLowerCase();
    return function(string) {
      string = string.toLowerCase();
      var start = 0, m = substring.length;
      var index, indices = [];
      while ((index = string.indexOf(substring, start)) > -1) {
        indices.push([index, index + m]);
        start = index + m;
      }
      return indices;
    };
  };
  var indicesOfQuery = indicesCaseInsensitive(query);

  var tabsWithIndices = tabs.map(function(tab) {
    return createTabWithIndices(tab, indicesOfQuery(tab.title), indicesOfQuery(tab.url));
  });

  var predicate = function(twi) {
    return twi.titleIndices.length > 0 || twi.urlIndices.length > 0;
  };

  // console.log(tabsWithIndices);
  return tabsWithIndices.filter(predicate);
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
      gotoTab(model.getHighlightedTab().tab);
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
  model.setTabsToDisplay(addEmptyIndices(allTabs));

  wireInput(allTabs);

  setFocusOnInput();
};

var onContentLoaded = function() {
  asyncGetTabs(processTabs);
};

document.addEventListener("DOMContentLoaded", onContentLoaded);
