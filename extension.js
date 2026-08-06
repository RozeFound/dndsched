/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {QuickMenuToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const SNOOZE_DURATIONS = [
    {label: '30 minutes', minutes: 30},
    {label: '1 hour',     minutes: 60},
    {label: '2 hours',    minutes: 120},
    {label: '4 hours',    minutes: 240},
];

const DnDSnoozeIndicator = GObject.registerClass(
class DnDSnoozeIndicator extends SystemIndicator {

    constructor(extension) {
        super();
        this._ext = extension;

        this._toggle = new QuickMenuToggle({
            title: 'Snooze',
            iconName: 'notifications-disabled-symbolic',
        });
        this._toggle.connect('clicked', this._onToggleClicked.bind(this));
        this.quickSettingsItems.push(this._toggle);

        this._buildMenu();
    }

    _buildMenu() {
        for (const {label, minutes} of SNOOZE_DURATIONS) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => this._activate(minutes));
            this._toggle.menu.addMenuItem(item);
        }

        this._toggle.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._cancelItem = new PopupMenu.PopupMenuItem('Cancel snooze');
        this._cancelItem.connect('activate', () => this._cancel());
        this._toggle.menu.addMenuItem(this._cancelItem);

        const settingsItem = new PopupMenu.PopupMenuItem('Schedule settings\u2026');
        settingsItem.connect('activate', () => this._ext.openPreferences());
        this._toggle.menu.addMenuItem(settingsItem);

        this.sync();
    }

    _activate(minutes) {
        this._ext._snooze_until = Date.now() + minutes * 60 * 1000;
        this._ext._enable_if_needed();
        this.sync();
    }

    _cancel() {
        this._ext._snooze_until = null;
        this._ext._enable_if_needed();
        this.sync();
    }

    _onToggleClicked() {
        const snoozed = this._ext._snooze_until !== null &&
                        Date.now() < this._ext._snooze_until;
        if (snoozed)
            this._cancel();
        // else: no active snooze — ignore click, toggle stays unchecked
    }

    sync() {
        const active = this._ext._snooze_until !== null &&
                       Date.now() < this._ext._snooze_until;
        this._toggle.checked = active;
        this._cancelItem.visible = active;
    }
});

export default class DnDExtension extends Extension {

    enable() {
        this._snooze_until = null;

        this.__notification_settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });

        this.__old_dnd = !this.__notification_settings.get_boolean('show-banners');
        this.__current_value = this.__old_dnd;

        this.__settings = this.getSettings('org.gnome.shell.extensions.dndsched');

        this._indicator = new DnDSnoozeIndicator(this);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

        this._enable_if_needed();

        this.__check_tid = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, this._regular_check.bind(this));

        this.__settings_enable_cid = this.__settings.connect('changed::enable-dnd-time-offset', this._enable_if_needed.bind(this));
        this.__settings_disable_cid = this.__settings.connect('changed::disable-dnd-time-offset', this._enable_if_needed.bind(this));
    }

    _regular_check() {
        this._enable_if_needed();
        return GLib.SOURCE_CONTINUE;
    }

    _enable_if_needed() {
        // Snooze override: force DnD on while snooze is active
        if (this._snooze_until !== null && Date.now() < this._snooze_until) {
            this._set_dnd(true);
            return;
        }

        // Snooze just expired — clear it and update the tile
        if (this._snooze_until !== null) {
            this._snooze_until = null;
            this._indicator?.sync();
        }

        let time = this._get_time();
        let enable_time = this.__settings.get_int('enable-dnd-time-offset');
        let disable_time = this.__settings.get_int('disable-dnd-time-offset');

        let dnd = ((enable_time < time && time < disable_time) ||
                  (enable_time > disable_time &&
                  (time <= disable_time || time >= enable_time)));

        this._set_dnd(dnd);
    }
    
    _set_dnd(value) {
        if (this.__current_value != value) {
            this.__current_value = value;
            this.__notification_settings.set_boolean('show-banners', !value);
        }
    }

    _get_time() {
        let time = new Date();
        return (time.getHours() * 60) + time.getMinutes();
    }

    _cleanup() {
        if (this.__check_tid) {
            GLib.source_remove(this.__check_tid);
            this.__check_tid = null;
        }
    }

    disable() {
        if (this.__settings_enable_cid) {
            this.__settings.disconnect(this.__settings_enable_cid);
            this.__settings_enable_cid = null;
        }

        if (this.__settings_disable_cid) {
            this.__settings.disconnect(this.__settings_disable_cid);
            this.__settings_disable_cid = null;
        }

        this._cleanup();

        if (this._indicator) {
            this._indicator.quickSettingsItems.forEach(item => item.destroy());
            this._indicator.destroy();
            this._indicator = null;
        }

        this._snooze_until = null;

        this._set_dnd(this.__old_dnd);

        this.__current_value = null;
        this.__settings = null;
        this.__notification_settings = null;
    }
}
