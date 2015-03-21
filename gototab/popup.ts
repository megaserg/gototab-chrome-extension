declare var chrome: any;

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

var displayTabList = function(tabDivs) {
  var list = getTabListDiv();

  // remove old items
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  // add new items
  for (var i in tabDivs) {
    list.appendChild(tabDivs[i]);
  }
};

var gotoTab = function(tab) {
  chrome.tabs.update(tab.id, {active: true});
  chrome.windows.update(tab.windowId, {focused: true});
};

/////////////////////////
// View helpers
/////////////////////////

var renderTabs = function(tabs) {

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

  var divList = [];
  for (var i = 0; i < n; i++) {
    var tab = tabs[i].tab;
    var titleIndices = tabs[i].titleIndices;
    var urlIndices = tabs[i].urlIndices;

    var div = document.createElement("div");
    div.classList.add("tabListItem");

    div.addEventListener("mouseover", (function(index) {
      return function(event) {
        model.setHighlightedTabIndex(index);
      }
    })(i), false);

    div.addEventListener("click", function(event) {
      if (model.hasTabs()) {
        gotoTab(model.getHighlightedTab().tab);
      }
    }, false);

    var favicon = document.createElement("img");
    favicon.classList.add("favicon");
    if (typeof(tab.favIconUrl) != "undefined") {
      favicon.src = tab.favIconUrl;
    }

    var titleSpan = document.createElement("span");
    titleSpan.classList.add("title");
    titleSpan.innerHTML = emphasize(tab.title, titleIndices);

    var br = document.createElement("br");

    var urlSpan = document.createElement("span");
    urlSpan.classList.add("url");
    urlSpan.innerHTML = emphasize(tab.url, urlIndices);

    div.appendChild(favicon);
    div.appendChild(titleSpan);
    div.appendChild(br);
    div.appendChild(urlSpan);

    divList.push(div);
  }

  return divList;
};

var refreshTabList = function() {
  displayTabList(
    renderTabs(
      model.getTabsToDisplay()));
};

var refreshHighlighting = function() {
  var highlightedTabIndex = model.getHighlightedTabIndex();

  var tabList = getTabListDiv();
  var tabDivs = tabList.childNodes;

  for (var i = 0; i < tabDivs.length; i++) {
    if (i == highlightedTabIndex) {
      tabDivs[i].classList.add("highlighted");
    } else {
      tabDivs[i].classList.remove("highlighted");
    }
  }
};


/////////////////////////
// Model
/////////////////////////

/*
 * TODO: ideally, model should not be calling refresh...(), but rather
 * broadcast an event "I, model, have changed". Controller should listen
 * to this event and update view whenever it comes.
 */

function Model() {

  // private fields
  var that = this;
  var tabsToDisplay = [];
  var highlightedTabIndex = 0;

  // private methods
  var isValidIndex = function(index) {
    return 0 <= index && index < tabsToDisplay.length;
  };

  // privileged methods (public, but able to access private variables)
  this.hasTabs = function() {
    return tabsToDisplay.length > 0;
  };

  this.getTabsToDisplay = function() {
    return tabsToDisplay;
  }

  this.getHighlightedTabIndex = function() {
    return highlightedTabIndex;
  };

  this.getHighlightedTab = function() {
    if (this.hasTabs() && isValidIndex(highlightedTabIndex)) {
      return tabsToDisplay[highlightedTabIndex];
    }
  };

  this.setTabsToDisplay = function(tabs) {
    tabsToDisplay = tabs;
    highlightedTabIndex = 0;
    refreshTabList();
    refreshHighlighting();
  };

  this.setHighlightedTabIndex = function(index) {
    if (highlightedTabIndex != index) {
      highlightedTabIndex = index;
      refreshHighlighting();
    }
  };

  this.decrementIndexIfPossible = function() {
    if (this.hasTabs() && isValidIndex(highlightedTabIndex - 1)) {
      highlightedTabIndex--;
      refreshHighlighting();
    }
  };

  this.incrementIndexIfPossible = function() {
    if (this.hasTabs() && isValidIndex(highlightedTabIndex + 1)) {
      highlightedTabIndex++;
      refreshHighlighting();
    }
  };
}

var model = new Model();

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

  var scorer = new FuzzySearch(query);
  var filter = FuzzySearch.filterRegex(query);

  var getScores = function(tab) {
    return Math.max(scorer.score(tab.title), scorer.score(tab.url));
  };

  var filterPredicate = function(tabWithIndex) {
    return filter.test(tabWithIndex.tab.title) || filter.test(tabWithIndex.tab.url);
  }

  return tabsWithIndices.filter(filterPredicate).sort(function(a, b) {
    return getScores(b.tab) - getScores(a.tab);
  });
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
  if (typeof(value) == "undefined") {
    value = map["default"];
  }
  return value;
};

// TODO: have "all tabs" in the model?
var wireInput = function(tabs) {
  var noop = function() {};

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
      handler(event);
    };
  };

  // For character keys, keyup should be used so that text field value is changed.
  var onKeyUp = invokeByKeymap({
    13: noop, // Enter key
    38: noop, // Up arrow key
    40: noop, // Down arrow key
    "default": processInput,
  });

  // For keys like Enter and arrows, keydown feels more responsive.
  var onKeyDown = invokeByKeymap({
    13: processEnter, // Enter key
    38: processUpArrow, // Up arrow key
    40: processDownArrow, // Down arrow key
    "default": noop,
  });

  wireInputListeners(getSearchInput(), onKeyDown, onKeyUp);
};

var onTabsLoaded = function(allTabs) {
  model.setTabsToDisplay(addEmptyIndices(allTabs));

  wireInput(allTabs);

  setFocusOnInput();
};

var onContentLoaded = function() {
  asyncGetTabs(onTabsLoaded);
};

document.addEventListener("DOMContentLoaded", onContentLoaded);
