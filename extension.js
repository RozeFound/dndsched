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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DnDExtension extends Extension {

    enable() {

        this.__notification_settings = new Gio.Settings({
            schema_id: "org.gnome.desktop.notifications",
        })

        this.__old_dnd = !this.__notification_settings.get_boolean('show-banners');
        this.__current_value = this.__old_dnd;

        this.__settings = this.getSettings('org.gnome.shell.extensions.dndsched');

        this._enable_if_needed();
        
        this. __check_tid = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, this._regular_check.bind(this));

        this.__settings_enable_cid = this.__settings.connect('changed::enable-dnd-time-offset', this._enable_if_needed.bind(this));
        this.__settings_disable_cid = this.__settings.connect('changed::disable-dnd-time-offset', this._enable_if_needed.bind(this));

    }

    _regular_check() {
        this._enable_if_needed();
        return GLib.SOURCE_CONTINUE;
    }

    _enable_if_needed() {

        let time = this._get_time();
        let enable_time = this.__settings.get_int('enable-dnd-time-offset');
        let disable_time = this.__settings.get_int('disable-dnd-time-offset');

        let dnd = ((enable_time < time && time < disable_time) || 
                  (enable_time > disable_time &&
                  (time <= disable_time || time >= enable_time)))
        
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
        
        this._set_dnd(this.__old_dnd);

        this.__dnd = null;
        this.__current_value = null;

        this.__settings = null;
        this.__notification_settings = null;
        
    }
}
