import pubsub = require("./PubSub");
import model = require("./Model");

export interface Renderer {
  render(): HTMLDivElement;
}

var renderAttributedString = function(attrStr: model.AttributedString): string {
  var res = "";

  var s: string = attrStr.s;
  var indices: number[][] = attrStr.indices;

  var n = s.length;
  var m = indices.length;

  var start = 0;
  for (var j = 0; j < m; j++) {
    res += s.substring(start, indices[j][0]);
    res += "<b>";
    res += s.substring(indices[j][0], indices[j][1]);
    res += "</b>";
    start = indices[j][1];
  }
  res += s.substring(start, n);

  return res;
};

interface ItemRenderer extends Renderer {}

class TabItemRenderer implements ItemRenderer {
  constructor(private item: model.DisplayedTabItem) {}

  render(): HTMLDivElement {
    var div = document.createElement("div");
    div.classList.add("tabListItem");

    var favicon = document.createElement("img");
    favicon.classList.add("favicon");
    if (typeof(this.item.faviconUrl) != "undefined") {
      favicon.src = this.item.faviconUrl;
    }

    var titleSpan = document.createElement("span");
    titleSpan.classList.add("tabTitle");
    titleSpan.innerHTML = renderAttributedString(this.item.title);

    var br = document.createElement("br");

    var urlSpan = document.createElement("span");
    urlSpan.classList.add("tabUrl");
    urlSpan.innerHTML = renderAttributedString(this.item.url);

    div.appendChild(favicon);
    div.appendChild(titleSpan);
    div.appendChild(br);
    div.appendChild(urlSpan);

    return div;
  }
}

class CommandItemRenderer implements ItemRenderer {
  constructor(private item: model.DisplayedCommandItem) {}

  render(): HTMLDivElement {
    var div = document.createElement("div");
    div.classList.add("commandListItem");

    var favicon = document.createElement("img");
    favicon.classList.add("favicon");
    favicon.classList.add("commandIcon");

    var commandNameSpan = document.createElement("span");
    commandNameSpan.classList.add("commandTitle");
    commandNameSpan.innerHTML = renderAttributedString(this.item.name);

    var commandShortcutSpan = document.createElement("span");
    commandShortcutSpan.classList.add("commandShortcut");
    commandShortcutSpan.innerHTML = this.item.shortcut;

    div.appendChild(favicon);
    div.appendChild(commandNameSpan);
    div.appendChild(commandShortcutSpan);

    return div;
  }
}

interface IndexedCallbackFactory {
  create(itemIndex: number): EventListener;
}

class MouseoverCallbackFactory implements IndexedCallbackFactory {
  constructor(
    private itemListIndex,
    private eventbus: pubsub.EventBus) {}

  public create(itemIndex: number): EventListener {
    var itemListIndex = this.itemListIndex;
    var eventbus = this.eventbus;
    return function(event: Event): void {
      eventbus.publish(pubsub.topics.ITEM_MOUSED_OVER, itemListIndex, itemIndex);
    }
  }
}

class ClickCallbackFactory implements IndexedCallbackFactory {
  constructor(
    private itemListIndex,
    private eventbus: pubsub.EventBus) {}

  public create(itemIndex: number): EventListener {
    var itemListIndex = this.itemListIndex;
    var eventbus = this.eventbus;
    return function(event: Event): void {
      eventbus.publish(pubsub.topics.ITEM_CLICKED, itemListIndex, itemIndex);
    }
  }
}

class ItemListRenderer implements Renderer {
  constructor(
    private itemRenderers: ItemRenderer[],
    private mouseoverCallbackFactory: IndexedCallbackFactory,
    private clickCallbackFactory: IndexedCallbackFactory) {}

  render(): HTMLDivElement {
    var listDiv = document.createElement("div");
    listDiv.classList.add("itemList");

    var n = this.itemRenderers.length;
    for (var i = 0; i < n; i++) {
      var itemDiv = this.itemRenderers[i].render();
      itemDiv.classList.add("listItem");

      itemDiv.addEventListener("mouseover", this.mouseoverCallbackFactory.create(i), false);
      itemDiv.addEventListener("click", this.clickCallbackFactory.create(i), false);

      listDiv.appendChild(itemDiv);
    }
    return listDiv;
  }
}

class ListsetRenderer implements Renderer {
  constructor(private itemListRenderers: ItemListRenderer[]) {}

  render(): HTMLDivElement {
    var listsetDiv = document.createElement("div");
    listsetDiv.classList.add("listContainer");

    var n = this.itemListRenderers.length;
    for (var i = 0; i < n; i++) {
      listsetDiv.appendChild(this.itemListRenderers[i].render());
    }

    return listsetDiv;
  }
}

function tabItemRenderers(items: model.DisplayedTabItem[]): TabItemRenderer[] {
  return items.map((item) => new TabItemRenderer(item));
}

function commandItemRenderers(items: model.DisplayedCommandItem[]): CommandItemRenderer[] {
  return items.map((item) => new CommandItemRenderer(item));
}

export function renderListset(
    tabItems: model.DisplayedTabItem[],
    commandItems: model.DisplayedCommandItem[],
    eventbus: pubsub.EventBus): Renderer {

  return new ListsetRenderer(
      [
        new ItemListRenderer(
            tabItemRenderers(tabItems),
            new MouseoverCallbackFactory(0, eventbus),
            new ClickCallbackFactory(0, eventbus)),
        new ItemListRenderer(
            commandItemRenderers(commandItems),
            new MouseoverCallbackFactory(1, eventbus),
            new ClickCallbackFactory(1, eventbus))
      ]);
}
