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

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class DnDPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {

        window.default_width = 580;
        window.default_height = 220;

        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup();
        page.add(group);

        group.add(this._add_timerow(_('Enable DnD after'), 'enable-dnd-time-offset'));
        group.add(this._add_timerow(_('Disable DnD after'), 'disable-dnd-time-offset'));

        window._settings = this.getSettings();
    }

    _add_timerow(_label, _settings_id) {

        let _settings = this.getSettings();

        let _time = _settings.get_int(_settings_id);
        let _hours = Math.floor(_time / 60)
        let _minutes = _time % 60;

        let row = new Adw.ActionRow({ title: _label });

        const hours_spin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 23,
                step_increment: 1,
                page_increment: 1,
                page_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        hours_spin.set_value(_hours);

        hours_spin.connect('changed', () => {
            _hours = hours_spin.get_value_as_int();
            _settings.set_int(_settings_id, _hours * 60 + _minutes);
        });

        const minutes_spin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 59,
                step_increment: 1,
                page_increment: 1,
                page_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        minutes_spin.set_value(_minutes);

        minutes_spin.connect('changed', () => {
            _minutes = minutes_spin.get_value_as_int();
            _settings.set_int(_settings_id, _hours * 60 + _minutes);
        });

        row.add_suffix(hours_spin);
        row.add_suffix(new Gtk.Label({label: ':'}));
        row.add_suffix(minutes_spin);

        return row;

    }

}