import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  Output,
  QueryList,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntil } from 'rxjs/operators/takeUntil';
import { startWith } from 'rxjs/operators/startWith';
import { Subject } from 'rxjs/Subject';

import { EventRegistry, isBrowser, toBoolean } from '@angular-mdc/web/common';

import {
  MdcAppBarActionItem,
  MdcAppBarNavigationIcon,
} from './app-bar.directives';
import { MDCTopAppBarAdapter } from '@material/top-app-bar/adapter';
import { MDCTopAppBarFoundation, util } from '@material/top-app-bar';

/** Event object emitted by MdcAppBar navigation icon selected. */
export class MdcAppBarNavSelected {
  constructor(
    /** Reference to the option that emitted the event. */
    public source: MdcAppBar) { }
}

@Component({
  selector: '[mdc-app-bar], mdc-app-bar',
  template: '<ng-content></ng-content>',
  exportAs: 'mdcAppBar',
  providers: [EventRegistry],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false
})
export class MdcAppBar implements AfterContentInit, AfterViewInit, OnDestroy {
  /** Emits whenever the component is destroyed. */
  private _destroy = new Subject<void>();

  @Input()
  get short(): boolean { return this._short; }
  set short(value: boolean) {
    this.setShort(value);
  }
  protected _short: boolean = false;

  @Input()
  get collapsed(): boolean { return this._collapsed; }
  set collapsed(value: boolean) {
    this.setCollapsed(value);
  }
  protected _collapsed: boolean = false;

  @Input()
  get fixedAdjustElement(): any { return this._fixedAdjustElement; }
  set fixedAdjustElement(element: any) {
    if (this._fixedAdjustElement !== element) {
      this.setFixedAdjustElement(element);
    }
  }
  protected _fixedAdjustElement: any;

  /** Event emitted when the navigation icon is selected. */
  @Output() navigationSelected: EventEmitter<MdcAppBarNavSelected> = new EventEmitter<MdcAppBarNavSelected>();

  @HostBinding('class.mdc-top-app-bar') isHostClass = true;
  @HostBinding('class.mdc-top-app-bar--short') get classShort(): string {
    return this.short ? 'mdc-top-app-bar--short' : '';
  }
  @HostBinding('class.mdc-top-app-bar--short-collapsed') get classShortCollapsed(): string {
    return this.collapsed ? 'mdc-top-app-bar--short-collapsed' : '';
  }

  @ContentChild(MdcAppBarNavigationIcon) navigationIcon: MdcAppBarNavigationIcon;
  @ContentChildren(MdcAppBarActionItem, { descendants: true }) actions: QueryList<MdcAppBarActionItem>;

  private _mdcAdapter: MDCTopAppBarAdapter = {
    addClass: (className: string) => this._renderer.addClass(this._getHostElement(), className),
    removeClass: (className: string) => this._renderer.removeClass(this._getHostElement(), className),
    hasClass: (className: string) => this._getHostElement().classList.contains(className),
    registerNavigationIconInteractionHandler: (type: string, handler: EventListener) => {
      if (this.navigationIcon) {
        this._registry.listen(type, handler, this.navigationIcon.getHostElement(), util.applyPassive());
      }
    },
    deregisterNavigationIconInteractionHandler: (type: string, handler: EventListener) => {
      if (this.navigationIcon) {
        this._registry.unlisten(type, handler);
      }
    },
    notifyNavigationIconClicked: () => this.navigationSelected.emit({ source: this }),
    registerScrollHandler: (handler: EventListener) => {
      if (!isBrowser()) { return; }

      const element = (this.fixedAdjustElement && this.short) ? this.fixedAdjustElement : window;
      this._registry.listen('scroll', handler, element, util.applyPassive());
    },
    deregisterScrollHandler: (handler: EventListener) => {
      if (!isBrowser()) { return; }

      this._registry.unlisten('scroll', handler);
    },
    getViewportScrollY: () => {
      if (!isBrowser()) { return 0; }

      return (this.fixedAdjustElement && this.short) ? this.fixedAdjustElement.scrollTop : window.pageYOffset;
    },
    getTotalActionItems: () => this.actions ? this.actions.length : 0
  };

  foundation: {
    init(): void,
    destroy(): void,
    scrollHandler_: any
  } = new MDCTopAppBarFoundation(this._mdcAdapter);

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _renderer: Renderer2,
    public elementRef: ElementRef,
    private _registry: EventRegistry) { }

  ngAfterViewInit(): void {
    this.foundation.init();
  }

  ngAfterContentInit(): void {
    this.actions.changes.pipe(startWith(null), takeUntil(this._destroy)).subscribe(() => {
      this.actions.length > 0 ? this._mdcAdapter.addClass('mdc-top-app-bar--short-has-action-item')
        : this._mdcAdapter.removeClass('mdc-top-app-bar--short-has-action-item');
    });
  }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
    this.foundation.destroy();
  }

  /** Sets the fixed adjust element for scrolling, if needed. */
  setFixedAdjustElement(element: any): void {
    this._fixedAdjustElement = element;
    this.refreshAppBar();

    this._changeDetectorRef.markForCheck();
  }

  /** Sets the top app bar to short or not. */
  setShort(short: boolean): void {
    this._short = toBoolean(short);
    this.refreshAppBar();

    this._changeDetectorRef.markForCheck();
  }

  /** Sets the top app bar to short-collapsed or not. */
  setCollapsed(collapsed: boolean): void {
    this._collapsed = toBoolean(collapsed);
    this.refreshAppBar();

    this._changeDetectorRef.markForCheck();
  }

  refreshAppBar() {
    this._mdcAdapter.deregisterScrollHandler(this.foundation.scrollHandler_);

    setTimeout(() => {
      if (!this.collapsed && this.short) {
        this._mdcAdapter.registerScrollHandler(this.foundation.scrollHandler_);
      }

      if (!this.collapsed && !this.short) {
        this._mdcAdapter.removeClass('mdc-top-app-bar--short-collapsed');
      }

      if (this.short && this._mdcAdapter.getViewportScrollY() > 0) {
        this._mdcAdapter.addClass('mdc-top-app-bar--short-collapsed');
      }
    }, 10);
  }

  /** Retrieves the DOM element of the component host. */
  private _getHostElement() {
    return this.elementRef.nativeElement;
  }
}
