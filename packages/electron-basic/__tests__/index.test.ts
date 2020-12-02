import { createBrowserInjector } from '../../../tools/dev-tool/src/injector-helper';
import { ElectronBasicContribution } from '../src/browser';
import { AppConfig, SlotLocation, IElectronMainMenuService, ComponentRegistry, CommandRegistry, KeybindingRegistry, addElement, electronEnv } from '@ali/ide-core-browser';
import { IElectronMenuBarService } from '@ali/ide-core-browser/lib/menu/next/renderer/ctxmenu/electron';
import { IMessageService } from '@ali/ide-overlay/lib/common';
import { IElectronMainLifeCycleService, IElectronMainUIService } from '@ali/ide-core-common/lib/electron';
import { IMenuRegistry } from '@ali/ide-core-browser/lib/menu/next';
import { ElectronNativeDialogService } from '../src/browser/dialog';
import { IWorkspaceService } from '@ali/ide-workspace';
import { WorkbenchEditorService, ResourceService } from '@ali/ide-editor';
import { WelcomeContribution } from '../src/browser/welcome/contribution';
import { EditorComponentRegistry } from '@ali/ide-editor/lib/browser';

function mockService(target) {
  return new Proxy(target, {
    get: (t, p) => {
      if (p === 'hasOwnProperty') {
        return t[p];
      }
      if (!t.hasOwnProperty(p)) {
        t[p] = jest.fn();
      }
      return t[p];
    },
  });
}

describe('electron basic contribution test', () => {

    const injector = createBrowserInjector([]);
    injector.addProviders({
      token: AppConfig,
      useValue: {
        layoutConfig: {
          [SlotLocation.top]: {
            modules: ['@ali/ide-menu-bar'],
          },
        },
      },
      override: true,
    }, {
      token: IElectronMenuBarService,
      useValue: mockService({}),
    }, {
      token: IElectronMainMenuService,
      useValue: mockService({}),
    },
    {
      token: IElectronMainUIService,
      useValue: mockService({}),
    },
    {
      token: IElectronMainLifeCycleService,
      useValue: mockService({}),
    },
    {
      token: IMessageService,
      useValue: mockService({}),
    });

    beforeAll(() => {
      (global as any).electronEnv =  (global as any).electronEnv || {};
    });

    it('component resgiter', () => {
      const contribution = injector.get(ElectronBasicContribution);
      const registry: ComponentRegistry = {
        register: jest.fn(),
        getComponentRegistryInfo: jest.fn(),
      };
      contribution.registerComponent(registry);

      const appConfig = injector.get(AppConfig) as AppConfig;
      expect(appConfig.layoutConfig[SlotLocation.top].modules[0]).toBe('electron-header');

      expect(registry.register).toBeCalledTimes(1);

    });

    it('menu register', () => {
      const contribution = injector.get(ElectronBasicContribution);
      const menuItems: any[] = [];
      const registry: IMenuRegistry = {
        registerMenuItem: jest.fn((item) => {
          menuItems.push(item);
        }),
        registerMenuItems: jest.fn(),
        registerMenubarItem: jest.fn(),
      } as any;

      contribution.registerNextMenus(registry);

      expect(registry.registerMenuItem).toBeCalled();

    });

    it('command register', async (done) => {

      const contribution = injector.get(ElectronBasicContribution);
      const commands: {command: any, handler: {execute: () => any}}[] = [];
      const registry: CommandRegistry = {
        registerCommand: jest.fn((command, handler) => {
          commands.push({
            command,
            handler,
          });
          return {
            dispose: () => undefined,
          };
        }),
      } as any;

      contribution.registerCommands(registry);

      expect(registry.registerCommand).toBeCalled();

      await Promise.all(commands.map(async (c) => {
        await c.handler.execute();
      }));

      done();
    });

    it('keyBinding register', () => {
      const contribution = injector.get(ElectronBasicContribution);
      const keybindings: any[] = [];
      const registry: KeybindingRegistry = {
        registerKeybinding: jest.fn((keybinding) => {
          return addElement(keybindings, keybinding);
        }),
      } as any;

      contribution.registerKeybindings(registry);

      expect(registry.registerKeybinding).toBeCalled();

    });

});

describe('native dialog test', () => {

  const injector = createBrowserInjector([]);
  injector.addProviders({
    token: IElectronMainUIService,
    useValue: mockService({}),
  });

  it('should pass arguments to electron main service', () => {
    const windowId = Math.floor(Math.random() * 100);
    electronEnv.currentWindowId = windowId;
    const dialogService = injector.get(ElectronNativeDialogService);
    const optionA = {};
    dialogService.showOpenDialog(optionA);
    expect(injector.get(IElectronMainUIService).showOpenDialog).toBeCalledWith(windowId, optionA);

    const optionB = {};
    dialogService.showSaveDialog(optionB);
    expect(injector.get(IElectronMainUIService).showSaveDialog).toBeCalledWith(windowId, optionB);
  });
});

describe('welcomeContribution test', () => {
  const injector = createBrowserInjector([]);
  injector.addProviders({
    token: IWorkspaceService,
    useValue: mockService({workspace: undefined}),
  }, {
    token: WorkbenchEditorService,
    useValue: mockService({}),
  });
  it('basic register', () => {
    const contribution = injector.get(WelcomeContribution) as WelcomeContribution;

    const editorComponentRegistry: EditorComponentRegistry = mockService({});
    const resourceService: ResourceService = mockService({});

    contribution.registerEditorComponent(editorComponentRegistry);
    expect(editorComponentRegistry.registerEditorComponent).toBeCalled();
    expect(editorComponentRegistry.registerEditorComponentResolver).toBeCalled();

    contribution.registerResource(resourceService);
    expect(resourceService.registerResourceProvider).toBeCalled();

    contribution.onDidStart();
    expect(injector.get(WorkbenchEditorService).open).toBeCalled();
  });
});
