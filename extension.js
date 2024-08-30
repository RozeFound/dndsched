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

        this._notification_settings = new Gio.Settings({
            schema_id: "org.gnome.desktop.notifications",
        })

        this.__dnd = !this._notification_settings.get_boolean('show-banners');

        this._settings = this.getSettings('org.gnome.shell.extensions.dndsched');

        this._reschedule();

        this.__settings_enable_tid = this._settings.connect('changed::enable-dnd-time-offset', () => {
            this._reschedule();
        });

        this.__settings_disable_tid = this._settings.connect('changed::disable-dnd-time-offset', () => {
            this._reschedule();
        });

    }

    _reschedule() {

        let time = Math.floor(this._get_time() / 60)
        let enable_time = this._settings.get_int('enable-dnd-time-offset');
        let disable_time = this._settings.get_int('disable-dnd-time-offset');

        let dnd = ((enable_time < time && time < disable_time) || 
                  (enable_time > disable_time &&
                  (time <= disable_time || time >= enable_time)))
        
        this._set_dnd(dnd);

        this._cleanup();
        
        this._enable_tid = this._sched_dnd(enable_time, true);
        this._disable_tid = this._sched_dnd(disable_time, false);

    }

    _sched_dnd(_time, _value) {
        return GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,
            Math.abs((_time * 60) - this._get_time()),
            ()=> { this._set_dnd(_value); } );
    }

    _set_dnd(_value) {
        this._notification_settings.set_boolean('show-banners', !_value);
    }

    _get_time() {
        let _time = new Date();
        return (_time.getHours() * 3600) + (_time.getMinutes() * 60) + _time.getSeconds();
    }

    _cleanup() {
        if (this._enable_tid) {
            GLib.Source.remove(this._enable_tid);
            this._enable_tid = null;
        }

        if (this._disable_tid) {
            GLib.Source.remove(this._disable_tid);
            this._disable_tid = null;
        }
    }

    disable() {

        if (this.__settings_enable_tid) {
            this._settings.disconnect(this.__settings_enable_tid);
            this.__settings_enable_tid = null;
        }

        if (this.__settings_disable_tid) {
            this._settings.disconnect(this.__settings_disable_tid);
            this.__settings_disable_tid = null;
        }

        this._cleanup();
        
        this._set_dnd(this.__dnd);

        this.__dnd = null;
        this._settings = null;
        this._notification_settings = null;
        
    }
}
