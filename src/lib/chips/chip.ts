import {
  Attribute,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { Subject } from 'rxjs/Subject';

import {
  toBoolean,
  EventRegistry,
  BACKSPACE, DELETE, SPACE
} from '@angular-mdc/web/common';
import { MdcRipple } from '@angular-mdc/web/ripple';
import { MdcIcon } from '@angular-mdc/web/icon';

import { MDCChipAdapter } from '@material/chips/chip/adapter';
import { MDCChipFoundation } from '@material/chips';

/** Represents an event fired on an individual `mdc-chip`. */
export interface MdcChipEvent {
  /** Reference to MdcChip that emitted the event. */
  chip: MdcChip;
}

/** Event object emitted by MdcChip when selected or deselected. */
export class MdcChipSelectionChange {
  constructor(
    /** Reference to the chip that emitted the event. */
    public source: MdcChip,
    /** Whether the chip that emitted the event is selected. */
    public selected: boolean,
    /** Whether the selection change was a result of a user interaction. */
    public isUserInput = false) { }
}

@Directive({
  selector: 'mdc-chip-icon, [mdc-chip-icon]',
  exportAs: 'mdcChipIcon'
})
export class MdcChipIcon extends MdcIcon {
  @Input()
  get leading(): boolean { return this._leading; }
  set leading(value: boolean) {
    this._leading = toBoolean(value);
  }
  private _leading: boolean;

  @Input()
  get trailing(): boolean { return this._trailing; }
  set trailing(value: boolean) {
    this._trailing = toBoolean(value);
  }
  private _trailing: boolean;

  @HostBinding('class.mdc-chip__icon') isHostClass = true;
  @HostBinding('class.mdc-chip__icon--leading') get classIconLeading(): string {
    return this.leading ? 'mdc-chip__icon--leading' : '';
  }
  @HostBinding('class.mdc-chip__icon--trailing') get classIconTrailing(): string {
    this.trailing ? this.getRenderer().setAttribute(this.elementRef.nativeElement, 'tabIndex', '0')
      : this.getRenderer().removeAttribute(this.elementRef.nativeElement, 'tabIndex');
    this.trailing ? this.getRenderer().setAttribute(this.elementRef.nativeElement, 'role', 'button')
      : this.getRenderer().removeAttribute(this.elementRef.nativeElement, 'role');

    return this.trailing ? 'mdc-chip__icon--trailing' : '';
  }

  isLeading(): boolean {
    return this._leading;
  }

  isTrailing(): boolean {
    return this._trailing;
  }

  constructor(
    @Inject(Renderer2) _renderer: Renderer2,
    @Inject(ElementRef) elementRef: ElementRef,
    @Attribute('aria-hidden') ariaHidden: string) {

    super(_renderer, elementRef, ariaHidden);
  }
}

@Directive({
  selector: 'mdc-chip-text',
  exportAs: 'mdcChipText'
})
export class MdcChipText {
  @HostBinding('class.mdc-chip__text') isHostClass = true;

  constructor(public elementRef: ElementRef) { }
}

let nextUniqueId = 0;

@Component({
  moduleId: module.id,
  selector: 'mdc-chip',
  host: {
    '[id]': 'id'
  },
  exportAs: 'mdcChip',
  template: '<ng-content></ng-content>',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    MdcRipple,
    EventRegistry,
  ],
  preserveWhitespaces: false,
})
export class MdcChip implements OnInit, OnDestroy {
  private _id = `mdc-chip-${nextUniqueId++}`;
  protected _selected: boolean = false;
  protected _disabled: boolean = false;

  /** Whether the chip has focus. */
  _hasFocus: boolean = false;

  /** The unique ID of the option. */
  get id(): string { return this._id; }

  /** Whether the chip is selected. */
  @Input()
  get selected(): boolean { return this._selected; }
  set selected(value: boolean) {
    this._selected = toBoolean(value);
    this.selectionChange.emit({
      source: this,
      isUserInput: false,
      selected: value
    });
  }

  /** Whether the chip is disabled. */
  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: boolean) {
    this._disabled = toBoolean(value);
  }

  /** Emits when the chip is focused. */
  readonly _onFocus = new Subject<MdcChipEvent>();

  /** Emits when the chip is blured. */
  readonly _onBlur = new Subject<MdcChipEvent>();

  /** Emitted when the chip is destroyed. */
  @Output() readonly destroyed: EventEmitter<MdcChipEvent> = new EventEmitter<MdcChipEvent>();

  /** Emitted when the chip is selected or deselected. */
  @Output() readonly selectionChange: EventEmitter<MdcChipSelectionChange> =
    new EventEmitter<MdcChipSelectionChange>();

  /** Emitted when a chip is to be removed. */
  @Output() readonly removed: EventEmitter<MdcChipEvent> = new EventEmitter<MdcChipEvent>();

  @HostBinding('class.mdc-chip') isHostClass = true;
  @HostBinding('attr.tabindex') get tabindex(): number | null {
    return this.disabled ? null : 0;
  }

  @HostListener('focus', ['$event']) onfocus() {
    this._hasFocus = true;
  }
  @HostListener('click', ['$event']) onclick(evt: Event) {
    this._handleClick(evt);
  }
  @HostListener('keydown', ['$event']) onkeydown(evt: KeyboardEvent) {
    this._handleKeydown(evt);
  }
  @HostListener('blur', ['$event']) onblur() {
    this._blur();
  }

  @ContentChild(MdcChipText) chipText: MdcChipText;
  @ContentChildren(MdcChipIcon) icons: QueryList<MdcChipIcon>;

  private _mdcAdapter: MDCChipAdapter = {
    addClass: (className: string) => this._renderer.addClass(this._getHostElement(), className),
    removeClass: (className: string) => this._renderer.removeClass(this._getHostElement(), className),
    hasClass: (className: string) => this._getHostElement().classList.contains(className),
    registerInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.listen(evtType, handler, this._getHostElement()),
    deregisterInteractionHandler: (evtType: string, handler: EventListener) =>
      this._registry.unlisten(evtType, handler),
    registerTrailingIconInteractionHandler: (evtType: string, handler: EventListener) => {
      if (this.icons) {
        const trailingIcon = this.icons.find((_: MdcChipIcon) => _.isTrailing());

        if (trailingIcon) {
          this._registry.listen(evtType, handler, trailingIcon.elementRef.nativeElement);
        }
      }
    },
    deregisterTrailingIconInteractionHandler: (evtType: string, handler: EventListener) => {
      if (this.icons) {
        this._registry.unlisten(evtType, handler);
      }
    },
    notifyInteraction: () => {
      this.selectionChange.emit({
        source: this,
        isUserInput: true,
        selected: this._selected
      });
    },
  };

  private _foundation: {
    init(): void,
    destroy(): void,
    toggleSelected(): void
  } = new MDCChipFoundation(this._mdcAdapter);

  constructor(
    private _ripple: MdcRipple,
    private _renderer: Renderer2,
    public elementRef: ElementRef,
    private _registry: EventRegistry) { }

  ngOnInit(): void {
    this._ripple.init();
    this._foundation.init();
  }

  ngOnDestroy(): void {
    this.destroyed.emit({ chip: this });
    this._foundation.destroy();
  }

  /** Allows for programmatic focusing of the chip. */
  focus(): void {
    this._getHostElement().focus();
    this._onFocus.next({ chip: this });
  }

  /**
   * Allows for programmatic removal of the chip. Called by the MdcChipSet when the DELETE or
   * BACKSPACE keys are pressed.
   *
   * Informs any listeners of the removal request. Does not remove the chip from the DOM.
   */
  remove(): void {
    this.removed.emit({ chip: this });
  }

  /** Selects the chip. */
  select(): void {
    this._selected = true;
    this._emitSelectionChangeEvent(false);
    this._foundation.toggleSelected();
  }

  /** Deselects the chip. */
  deselect(): void {
    this._selected = false;
    this._emitSelectionChangeEvent(false);
    this._foundation.toggleSelected();
  }

  /** Select this chip and emit selected event */
  selectViaInteraction(): void {
    this._selected = true;
    this._emitSelectionChangeEvent(true);
    this._foundation.toggleSelected();
  }

  /** Toggles the current selected state of this chip. */
  toggleSelected(isUserInput: boolean = false): boolean {
    this._selected = !this.selected;
    this._emitSelectionChangeEvent(isUserInput);
    this._foundation.toggleSelected();

    this._foundation.toggleSelected();

    return this.selected;
  }

  /** Ensures events fire properly upon click. */
  _handleClick(event: Event) {
    if (this.disabled) {
      return;
    }
    this.select();

    event.preventDefault();
    event.stopPropagation();

    this.focus();
  }

  /** Handle custom key presses. */
  _handleKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    switch (event.keyCode) {
      case DELETE:
      case BACKSPACE:
        // If we are removable, remove the focused chip
        this.remove();
        // Always prevent so page navigation does not occur
        event.preventDefault();
        break;
      case SPACE:
        if (!this.disabled) {
          this.toggleSelected(true);
        }

        // Always prevent space from scrolling the page since the list has focus
        event.preventDefault();
        break;
    }
  }

  _blur(): void {
    this._onBlur.next({ chip: this });
  }

  /** Retrieves the DOM element of the component host. */
  private _getHostElement() {
    return this.elementRef.nativeElement;
  }

  /** Emits the selection change event. */
  private _emitSelectionChangeEvent(isUserInput = false): void {
    this.selectionChange.emit({ source: this, isUserInput: isUserInput, selected: this.selected });
  }
}
