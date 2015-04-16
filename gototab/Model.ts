/// <reference path="PubSub.ts" />

module model {
  export class AttributedString {
    constructor(
      public s: string,
      public indices: number[][]) {}
  }

  export interface Item {
    action: Function;
  }

  export interface DisplayedItem extends Item {}

  export class TabItem implements Item {
    constructor(
      public title: string,
      public url: string,
      public faviconUrl: string,
      public action: Function) {}
  }

  export class CommandItem implements Item {
    constructor(
      public name: string,
      public shortcut: string,
      public action: Function) {}
  }

  export class DisplayedTabItem implements DisplayedItem {
    constructor(
      public title: AttributedString,
      public url: AttributedString,
      public faviconUrl: string,
      public action: Function) {}
  }

  export class DisplayedCommandItem implements DisplayedItem {
    constructor (
      public name: AttributedString,
      public shortcut: string,
      public action: Function) {}
  }

  export class DisplayedItemList<T extends DisplayedItem> {
    private displayedItems: T[] = [];

    // constructor(private eventbus: pubsub.EventBus) {}

    public hasItems(): boolean {
      return this.displayedItems.length > 0;
    }

    public isValidIndex(index: number): boolean {
      return 0 <= index && index < this.displayedItems.length;
    }

    public getDisplayedItemsCount(): number {
      return this.displayedItems.length;
    }

    public setDisplayedItems(items: T[]): void {
      this.displayedItems = items;
    }

    public getItemsToDisplay(): T[] {
      return this.displayedItems;
    }

    public getItem(index: number): T {
      if (this.isValidIndex(index)) {
        return this.displayedItems[index];
      }
    }
  }

  export class DisplayedItemListset {

    private highlightedItemListIndex = 0;
    private highlightedItemIndex = 0;

    private recentEmittedItemListIndex = -1;
    private recentEmittedItemIndex = -1;

    constructor(
      private eventbus: pubsub.EventBus,
      private displayedItemLists: DisplayedItemList<DisplayedItem>[]) {}

    // private methods

    private emitItemListChanged(): void {
      this.eventbus.publish(pubsub.topics.MODEL_ITEM_LIST_CHANGED);
    }

    private emitItemHighlighted(): void {
      var itemListIndex = this.highlightedItemListIndex;
      var itemIndex = this.highlightedItemIndex;

      if (itemListIndex != this.recentEmittedItemListIndex ||
          itemIndex != this.recentEmittedItemIndex) {
        if (this.isValidIndexPair(
                this.recentEmittedItemListIndex,
                this.recentEmittedItemIndex)) {
          this.eventbus.publish(
              pubsub.topics.MODEL_ITEM_UNHIGHLIGHTED,
              this.recentEmittedItemListIndex,
              this.recentEmittedItemIndex);
        }
        this.eventbus.publish(
            pubsub.topics.MODEL_ITEM_HIGHLIGHTED,
            itemListIndex,
            itemIndex);
        this.recentEmittedItemListIndex = itemListIndex;
        this.recentEmittedItemIndex = itemIndex;
      }
    }

    private isValidItemListIndex(itemIndex: number): boolean {
      return 0 <= itemIndex && itemIndex < this.displayedItemLists.length;
    }

    // public methods

    public getItemList<T extends DisplayedItem>(itemListIndex: number): DisplayedItemList<T> {
      if (this.isValidItemListIndex(itemListIndex)) {
        return <DisplayedItemList<T>> this.displayedItemLists[itemListIndex];
      } else {
        return null;
      }
    }

    public setItemList(itemListIndex:number, items: DisplayedItem[]): void {
      if (this.isValidItemListIndex(itemListIndex)) {
        this.displayedItemLists[itemListIndex].setDisplayedItems(items);
        this.emitItemListChanged();
      }
    }

    public resetHighlighting(): void {
      this.recentEmittedItemListIndex = -1;
      this.recentEmittedItemIndex = -1;

      this.highlightedItemListIndex = 0;
      for (var listIndex = 0; listIndex < this.displayedItemLists.length; listIndex++) {
        if (this.displayedItemLists[listIndex].hasItems()) {
          this.highlightedItemListIndex = listIndex;
          break;
        }
      }
      this.highlightedItemIndex = 0;

      this.emitItemHighlighted();
    }

    public setHighlighting(itemListIndex: number, itemIndex: number): void {
      this.highlightedItemListIndex = itemListIndex;
      this.highlightedItemIndex = itemIndex;
      this.emitItemHighlighted();
    }

    public decrementIndexIfPossible(): void {
      var listIndex = this.highlightedItemListIndex;
      if (this.isValidItemListIndex(listIndex)) {
        var itemList = this.displayedItemLists[listIndex];
        if (itemList.isValidIndex(this.highlightedItemIndex - 1)) {
          this.highlightedItemIndex--;
          this.emitItemHighlighted();
        } else {
          for (listIndex = listIndex - 1; listIndex >= 0; listIndex--) {
            itemList = this.displayedItemLists[listIndex];
            if (itemList.hasItems()) {
              this.highlightedItemListIndex = listIndex;
              this.highlightedItemIndex = itemList.getDisplayedItemsCount() - 1;
              this.emitItemHighlighted();
              break;
            }
          }
          if (listIndex < 0) {
            // we are already at the top item in the top non-empty list
          }
        }
      }
    }

    public incrementIndexIfPossible(): void {
      var listIndex = this.highlightedItemListIndex;
      if (this.isValidItemListIndex(listIndex)) {
        var itemList = this.displayedItemLists[listIndex];
        if (itemList.isValidIndex(this.highlightedItemIndex + 1)) {
          this.highlightedItemIndex++;
          this.emitItemHighlighted();
        } else {
          for (listIndex = listIndex + 1; listIndex < this.displayedItemLists.length; listIndex++) {
            itemList = this.displayedItemLists[listIndex];
            if (itemList.hasItems()) {
              this.highlightedItemListIndex = listIndex;
              this.highlightedItemIndex = 0;
              this.emitItemHighlighted();
              break;
            }
          }
          if (listIndex == this.displayedItemLists.length) {
            // we are already at the bottom item in the bottom non-empty list
          }
        }
      }
    }

    private isValidIndexPair(itemListIndex: number, itemIndex: number): boolean {
      if (this.isValidItemListIndex(itemListIndex)) {
        var itemList = this.displayedItemLists[itemListIndex];
        return itemList.isValidIndex(itemIndex);
      } else {
        return false;
      }
    }

    public getHighlightedItem(): DisplayedItem {
      var itemListIndex = this.highlightedItemListIndex;
      if (this.isValidItemListIndex(itemListIndex)) {
        var itemList = this.displayedItemLists[itemListIndex];
        return itemList.getItem(this.highlightedItemIndex);
      } else {
        return null;
      }
    }
  }
}
