/**
 * Gets all tabs.
 *
 * @param {function(array[Tab])} processTabs
 *   Called with the list of tabs.
 */
function getTabs(processTabs) {
  var queryInfo = {
    // To limit the search to the current window, uncomment the following line.
    // currentWindow: true
  };

  chrome.tabs.query(queryInfo, processTabs);
};

var getSearchInput = function() {
  return document.getElementById("searchInput");
};

var getTabListDiv = function() {
  return document.getElementById("tabListDiv");
};

var setFocusOnInput = function() {
  getSearchInput().focus();
};

var renderTabList = function(html) {
  getTabListDiv().innerHTML = html;
};

var drawTabs = function(tabs, highlightedTabIndex) {
  var n = tabs.length;

  var listhtml = "";
  for (var i = 0; i < n; i++) {
    listhtml += "<div" + (i == highlightedTabIndex ? " class='highlighted'" : "") + ">";
    listhtml += "<img src='" + tabs[i].favIconUrl + "' class='favicon' />";
    listhtml += "<span class='title'>" + tabs[i].title + "</span>";
    listhtml += "<br />";
    listhtml += "<span class='url'>" + tabs[i].url + "</span>";
    listhtml += "</div>";
  }

  renderTabList(listhtml);
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

  var filteredTabs = tabs.filter(predicate);
  return filteredTabs;
};

var gotoTab = function(tab) {
  chrome.tabs.update(tab.id, {active: true});
  chrome.windows.update(tab.windowId, {focused: true});
};

/**
 * Wires up the function to react on the input.
 *
 * @param {function(event)} processInput
 *   Called when user inputs something.
 * @param {function(event)} processEnter
 *   Called when user presses Enter.
 * @param {function(event)} processUpArrow
 *   Called when user presses Up.
 * @param {function(event)} processDownArrow
 *   Called when user presses Down.
 */
var wireOnChangeListener = function(
    processInput,
    processEnter,
    processUpArrow,
    processDownArrow) {

  var processEdit = function(event) {
    var key = event.keyCode;
    if (key != 13 && key != 38 && key != 40) { // not a functional key
      processInput(event);
    }
  };

  var processFunctionalKeys = function(event) {
    if (event.keyCode == 13) { // Enter key
      processEnter(event);
    } else if (event.keyCode == 38) { // Up arrow key
      processUpArrow(event);
    } else if (event.keyCode == 40) { // Down arrow key
      processDownArrow(event);
    }
  };

  // For character keys, keyup should be used so that text field value is changed.
  getSearchInput().addEventListener("keyup", processEdit, false);
  // For keys like Enter and arrows, keydown feels more responsive.
  getSearchInput().addEventListener("keydown", processFunctionalKeys, false);
};

var refreshView = function() {
  drawTabs(tabsToDisplay, highlightedTabIndex);
};

// Global state
var tabsToDisplay = [];
var highlightedTabIndex = -1;

var setTabsToDisplay = function(tabs) {
  tabsToDisplay = tabs;
  if (tabs.length > 0) {
    highlightedTabIndex = 0;
  } else {
    highlightedTabIndex = -1;
  }
  refreshView();
};

var setHighlightedTabIndex = function(index) {
  highlightedTabIndex = index;
  refreshView();
}

document.addEventListener("DOMContentLoaded", function() {
  getTabs(function(tabs) {

    var processInput = function(event) {
      var query = getSearchInput().value;
      setTabsToDisplay(filterTabs(tabs, query));
    };

    var processEnter = function(event) {
      if (highlightedTabIndex != -1) {
        gotoTab(tabsToDisplay[highlightedTabIndex]);
      }
    };

    var processUpArrow = function(event) {
      if (tabsToDisplay.length > 0) {
        if (highlightedTabIndex - 1 >= 0) {
          setHighlightedTabIndex(highlightedTabIndex - 1);
        }
      }
    };

    var processDownArrow = function(event) {
      if (tabsToDisplay.length > 0) {
        if (highlightedTabIndex + 1 < tabsToDisplay.length) {
          setHighlightedTabIndex(highlightedTabIndex + 1);
        }
      }
    };

    wireOnChangeListener(processInput, processEnter, processUpArrow, processDownArrow);

    setFocusOnInput();

    setTabsToDisplay(tabs);
  });
});
