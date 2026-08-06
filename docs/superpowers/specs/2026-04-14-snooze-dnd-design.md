# Snooze DnD — Design Spec

**Date:** 2026-04-14
**Status:** Approved

---

## Overview

Add a Quick Settings tile that lets the user temporarily disable Do Not Disturb (snooze) for a chosen duration, overriding the active schedule. When the snooze expires, the normal schedule resumes automatically.

---

## User-Facing Behaviour

- A `QuickMenuToggle` tile labelled "Snooze DnD" appears in the GNOME Quick Settings panel.
- Clicking the right arrow opens a submenu with four duration options: **30 minutes**, **1 hour**, **2 hours**, **4 hours**.
- Selecting a duration activates the snooze: the tile turns highlighted (checked), DnD is immediately disabled, and a "Cancel snooze" item appears at the bottom of the submenu (below a separator).
- Clicking the main toggle button while the snooze is active cancels it immediately.
- Clicking the main toggle button while inactive is a no-op (snaps back to unchecked); the user must pick a duration from the menu.
- When the snooze expires the tile returns to unchecked and the normal schedule resumes (within ~1 minute).
- Snooze state is **in-memory only** — restarting GNOME Shell or rebooting clears it.

---

## Architecture

### Snooze state

A single instance variable `_snooze_until` (JS millisecond timestamp, or `null`) stored on the `DnDExtension` instance. No GSettings key is needed.

### `_enable_if_needed()` — updated logic

```
if (_snooze_until !== null && Date.now() < _snooze_until):
    _set_dnd(false)
    return
else:
    if (_snooze_until !== null):
        _snooze_until = null          // expired — clear it
        _indicator.sync()             // update tile to unchecked
    // existing schedule logic unchanged
```

### `DnDSnoozeIndicator` class

A new class in `extension.js` that encapsulates both the `SystemIndicator` and its `QuickMenuToggle`:

| Responsibility | Detail |
|---|---|
| Create toggle | `QuickMenuToggle` with label "Snooze DnD" and a bell-slash icon |
| Build submenu | Four `PopupMenuItem` entries for durations + separator + Cancel item |
| `_activate(minutes)` | Sets `extension._snooze_until`, calls `_enable_if_needed()`, syncs UI |
| `_cancel()` | Clears `extension._snooze_until`, calls `_enable_if_needed()`, syncs UI |
| `sync()` | Updates toggle `checked` state and Cancel item visibility |
| Toggle click | If checked -> `_cancel()`; if unchecked -> revert (no-op) |

### `enable()` / `disable()` changes

- `enable()`: instantiates `DnDSnoozeIndicator`, stores it as `this._indicator`, adds it to `Main.panel.statusArea.quickSettings`.
- `disable()`: destroys the indicator, sets `this._indicator = null` and `this._snooze_until = null`.

---

## Files Changed

| File | Change |
|---|---|
| `extension.js` | Add `DnDSnoozeIndicator` class; update `_enable_if_needed()`; wire up in `enable()`/`disable()` |
| `prefs.js` | No changes |
| `schemas/` | No changes |
| `metadata.json` | No changes |

---

## Out of Scope

- Countdown display on the tile (no "47 min remaining" subtitle).
- Persisting snooze across restarts.
- Configurable default snooze duration.
- Notifications when snooze expires.
