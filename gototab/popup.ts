import chromeApi = require("./ChromeAPI");
import docApi = require("./DocumentAPI");
import pubsub = require("./PubSub");
import model = require("./Model");
import search = require("./Search");
import render = require("./Render");

var ACTION_ITEMS = [
    new model.CommandItem("Open History", "Ctrl+H / &#8984;+Y", chromeApi.openHistory),
    new model.CommandItem("Open Downloads", "Ctrl+J / &#8679;+&#8984;+J", chromeApi.openDownloads),
    new model.CommandItem("Open Extensions", "[no shortcut]", chromeApi.openExtensions),
    new model.CommandItem("Open Settings", "&#8984;+,", chromeApi.openSettings),
];

var eventbus = new pubsub.EventBus();

// global state

var allTabItems: model.TabItem[];
var allCommandItems: model.CommandItem[] = ACTION_ITEMS;

var itemListset = new model.DisplayedItemListset(
    eventbus,
    [
        new model.DisplayedItemList<model.DisplayedTabItem>(),
        new model.DisplayedItemList<model.DisplayedCommandItem>()
    ]);


/////////////////////////
// Controller functions
/////////////////////////

var setupSubscriptionsForModelChanges = function() {
  var rerenderListset = function() {
    var listset = itemListset;

    var tabItemList = listset.getItemList<model.DisplayedTabItem>(0);
    var tabItems: model.DisplayedTabItem[] = tabItemList.getItemsToDisplay();

    var commandItemList = listset.getItemList<model.DisplayedCommandItem>(1);
    var commandItems: model.DisplayedCommandItem[] = commandItemList.getItemsToDisplay();

    var listsetRenderer: render.Renderer =
        render.renderListset(tabItems, commandItems, eventbus);

    docApi.displayItemListset(listsetRenderer.render());
  };

  // from model
  eventbus.subscribe(pubsub.topics.MODEL_ITEM_LIST_CHANGED, rerenderListset);
  eventbus.subscribe(pubsub.topics.MODEL_ITEM_HIGHLIGHTED, docApi.highlightItem);
  eventbus.subscribe(pubsub.topics.MODEL_ITEM_UNHIGHLIGHTED, docApi.unhighlightItem);
};

var setupSubscriptionsForUserActions = function() {
  var updateItemLists = function() {
    var query = docApi.getCurrentQuery();

    var displayedTabItems: model.DisplayedTabItem[] = search.filterTabItems(allTabItems, query);

    var displayedCommandItems: model.DisplayedCommandItem[] = search.filterCommandItems(allCommandItems, query);

    itemListset.setItemList(0, displayedTabItems);
    itemListset.setItemList(1, displayedCommandItems);
    itemListset.resetHighlighting();
  };

  var moveHighlightingUp = function() {
    itemListset.decrementIndexIfPossible();
  };

  var moveHighlightingDown = function() {
    itemListset.incrementIndexIfPossible();
  };

  var executeAction = function() {
    var highlightedItem = itemListset.getHighlightedItem();
    if (highlightedItem) {
      highlightedItem.action();
    }
  };

  var updateHighlighting = function(itemListIndex: number, itemIndex: number) {
    itemListset.setHighlighting(itemListIndex, itemIndex);
  };

  // from user actions (search field)
  eventbus.subscribe(pubsub.topics.SEARCH_TERM_CHANGED, updateItemLists);
  eventbus.subscribe(pubsub.topics.UP_ARROW_KEY_PRESSED, moveHighlightingUp);
  eventbus.subscribe(pubsub.topics.DOWN_ARROW_KEY_PRESSED, moveHighlightingDown);
  eventbus.subscribe(pubsub.topics.ENTER_KEY_PRESSED, executeAction);

  // from user actions (mouse)
  eventbus.subscribe(pubsub.topics.ITEM_MOUSED_OVER, updateHighlighting);
  eventbus.subscribe(pubsub.topics.ITEM_CLICKED, executeAction);
};

var setupKeyPresses = function() {
  var ENTER_KEY = 13, UP_ARROW_KEY = 38, DOWN_ARROW_KEY = 40;

  // For keys like Enter and arrows, keydown feels more responsive.
  var onKeyDown = function(event: KeyboardEvent): void {
    var keyCode = event.keyCode;
    if (keyCode == ENTER_KEY) {
      eventbus.publish(pubsub.topics.ENTER_KEY_PRESSED);
    } else if (keyCode == UP_ARROW_KEY) {
      eventbus.publish(pubsub.topics.UP_ARROW_KEY_PRESSED);
    } else if (keyCode == DOWN_ARROW_KEY) {
      eventbus.publish(pubsub.topics.DOWN_ARROW_KEY_PRESSED);
    }
  };

  // For character keys, keyup should be used so that text field value is changed.
  var onKeyUp = function(event: KeyboardEvent): void {
    var keyCode = event.keyCode;
    if (keyCode != ENTER_KEY && keyCode != UP_ARROW_KEY && keyCode != DOWN_ARROW_KEY) {
      eventbus.publish(pubsub.topics.SEARCH_TERM_CHANGED);
    }
  };

  docApi.wireKeyPressesForInput(onKeyDown, onKeyUp);
};

var initializeWithTabs = function(chromeTabs: chromeApi.ChromeTab[]): void {

  var tabItemFromChromeTab = function(tab: chromeApi.ChromeTab): model.TabItem {
    var tabOpenFn = function() {
      chromeApi.gotoTab(tab.id, tab.windowId);
    };
    return new model.TabItem(tab.title, tab.url, tab.favIconUrl, tabOpenFn);
  };

  var tabItemsFromChromeTabs = function(chromeTabs: chromeApi.ChromeTab[]): model.TabItem[] {
    return chromeTabs.map(tabItemFromChromeTab);
  };

  setupSubscriptionsForModelChanges();
  setupSubscriptionsForUserActions();
  allTabItems = tabItemsFromChromeTabs(chromeTabs);
  eventbus.publish(pubsub.topics.SEARCH_TERM_CHANGED);
  setupKeyPresses();
  docApi.setFocusOnInput();
};

var fetchTabsAndInitialize = function(): void {
  chromeApi.asyncGetTabs(initializeWithTabs);
};

// docApi.executeOnload();
fetchTabsAndInitialize();
