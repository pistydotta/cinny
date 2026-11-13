import React, { useMemo, useState } from 'react';
import { Icons, IconSrc, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import FocusTrap from 'focus-trap-react';
import { AppearanceSettings, ChatSettings, VoiceSettings } from './general';
import { Account } from './account';
import { Notifications } from './notifications';
import { Privacy } from './privacy';
import { EmojisStickers } from './emojis-stickers';
import { DeveloperTools } from './developer-tools';
import { About } from './about';
import { Admin } from './admin';
import { tr } from '../translation/tr';
import { useAdminRole } from '../admin/useAdminApi';
import { AdminRole } from '../admin/adminApi';
import { stopPropagation } from '../../utils/keyboard';
import { LogoutDialog } from '../../components/LogoutDialog';
import { SettingsShell } from '../settings-shell';

export enum SettingsPages {
  AccountPage,
  AppearancePage,
  ChatsPage,
  NotificationPage,
  VoicePage,
  PrivacyPage,
  EmojisStickersPage,
  AdvancedPage,
  AdminPage,
  AboutPage,
}

type SettingsMenuItem = {
  page: SettingsPages;
  name: string;
  icon: IconSrc;
};

const useSettingsMenuItems = (adminRole: AdminRole): SettingsMenuItem[] => {
  const isServerAdmin = adminRole.admin;
  return useMemo(
    () => [
      {
        page: SettingsPages.AccountPage,
        name: tr('settings.tab.account', 'Account'),
        icon: Icons.User,
      },
      {
        page: SettingsPages.AppearancePage,
        name: tr('settings.tab.appearance', 'Appearance'),
        icon: Icons.Setting,
      },
      {
        page: SettingsPages.ChatsPage,
        name: tr('settings.tab.chats', 'Chats'),
        icon: Icons.Message,
      },
      {
        page: SettingsPages.NotificationPage,
        name: tr('settings.tab.notifications', 'Notifications'),
        icon: Icons.Bell,
      },
      {
        page: SettingsPages.VoicePage,
        name: tr('settings.tab.voice', 'Voice & video'),
        icon: Icons.Mic,
      },
      {
        page: SettingsPages.PrivacyPage,
        name: tr('settings.tab.privacy', 'Privacy & security'),
        icon: Icons.Lock,
      },
      {
        page: SettingsPages.EmojisStickersPage,
        name: tr('settings.tab.emojis', 'Emojis & Stickers'),
        icon: Icons.Smile,
      },
      {
        page: SettingsPages.AdvancedPage,
        name: tr('settings.tab.advanced', 'Advanced'),
        icon: Icons.Terminal,
      },
      ...(isServerAdmin
        ? [
            {
              page: SettingsPages.AdminPage,
              name: tr('settings.tab.admin', 'Admin'),
              icon: Icons.ShieldUser,
            },
          ]
        : []),
      {
        page: SettingsPages.AboutPage,
        name: tr('settings.tab.help_about', 'Help & about'),
        icon: Icons.Info,
      },
    ],
    [isServerAdmin]
  );
};

type SettingsProps = {
  initialPage?: SettingsPages;
  requestClose: () => void;
};
export function Settings({ initialPage, requestClose }: SettingsProps) {
  const [activePage, setActivePage] = useState<SettingsPages>(
    initialPage ?? SettingsPages.AccountPage
  );
  const [logout, setLogout] = useState(false);
  const adminRole = useAdminRole();
  const menuItems = useSettingsMenuItems(adminRole);

  return (
    <SettingsShell
      tabs={menuItems}
      activePage={activePage}
      onSelect={setActivePage}
      requestClose={requestClose}
      onLogout={() => setLogout(true)}
    >
      {activePage === SettingsPages.AccountPage && <Account requestClose={requestClose} />}
      {activePage === SettingsPages.AppearancePage && (
        <AppearanceSettings requestClose={requestClose} />
      )}
      {activePage === SettingsPages.ChatsPage && <ChatSettings requestClose={requestClose} />}
      {activePage === SettingsPages.NotificationPage && (
        <Notifications requestClose={requestClose} />
      )}
      {activePage === SettingsPages.VoicePage && <VoiceSettings requestClose={requestClose} />}
      {activePage === SettingsPages.PrivacyPage && <Privacy requestClose={requestClose} />}
      {activePage === SettingsPages.EmojisStickersPage && (
        <EmojisStickers requestClose={requestClose} />
      )}
      {activePage === SettingsPages.AdvancedPage && <DeveloperTools requestClose={requestClose} />}
      {activePage === SettingsPages.AdminPage && (
        <Admin requestClose={requestClose} role={adminRole} />
      )}
      {activePage === SettingsPages.AboutPage && <About requestClose={requestClose} />}
      {logout && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                onDeactivate: () => setLogout(false),
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <LogoutDialog handleClose={() => setLogout(false)} />
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </SettingsShell>
  );
}
