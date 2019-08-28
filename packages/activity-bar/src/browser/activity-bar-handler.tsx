import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Title, Widget, BoxPanel } from '@phosphor/widgets';
import { ActivityBarWidget } from './activity-bar-widget.view';
import { AppConfig, ConfigProvider, SlotRenderer } from '@ali/ide-core-browser';
import { Event, Emitter } from '@ali/ide-core-common';
import { ViewsContainerWidget } from '@ali/ide-activity-panel/lib/browser/views-container-widget';
import { View } from '@ali/ide-core-browser/lib/layout';

export class ActivityBarHandler {

  private widget: BoxPanel = this.title.owner as BoxPanel;
  private containerWidget: ViewsContainerWidget = (this.title.owner as BoxPanel).widgets[1] as ViewsContainerWidget;

  protected readonly onActivateEmitter = new Emitter<void>();
  readonly onActivate: Event<void> = this.onActivateEmitter.event;

  protected readonly onInActivateEmitter = new Emitter<void>();
  readonly onInActivate: Event<void> = this.onInActivateEmitter.event;

  protected readonly onCollapseEmitter = new Emitter<void>();
  readonly onCollapse: Event<void> = this.onCollapseEmitter.event;

  public isVisible: boolean = false;

  constructor(private title: Title<Widget>, private activityBar: ActivityBarWidget, private configContext: AppConfig) {
    this.activityBar.currentChanged.connect((tabbar, args) => {
      const { currentWidget, previousWidget } = args;
      if (currentWidget === this.widget) {
        this.onActivateEmitter.fire();
        this.isVisible = true;
      } else if (previousWidget === this.widget) {
        this.onInActivateEmitter.fire();
        this.isVisible = false;
      }
    });
    this.activityBar.onCollapse.connect((tabbar, title) => {
      if (this.widget.title === title) {
        this.onCollapseEmitter.fire();
      }
    });
  }

  dispose() {
    this.activityBar.tabBar.removeTab(this.title);
  }

  activate() {
    this.activityBar.currentWidget = this.widget;
  }

  setComponent(Fc: React.FunctionComponent | React.FunctionComponent[]) {
    ReactDOM.render(
      <ConfigProvider value={this.configContext} >
        <SlotRenderer Component={Fc} />
      </ConfigProvider>
    , this.widget.node);
  }

  setSize(size: number) {
    this.activityBar.showPanel(size);
  }

  setBadge(badge: string) {
    // @ts-ignore
    this.title.badge = badge;
    this.activityBar.tabBar.update();
  }

  registerView(view: View, component: React.FunctionComponent<any>, props?: any) {
    this.containerWidget.addWidget(view, component, props);
  }

  isCollpased(viewId: string) {
    const section = this.containerWidget.sections.get(viewId);
    if (!section) {
      console.error('没有找到对应的view!');
    } else {
      return !section.opened;
    }
  }

}
