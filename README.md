# Attachment Preview — MyBB Plugin

Adds a preview button to image attachments for quick viewing in a lightbox overlay. Supports prev/next navigation, keyboard controls, and works seamlessly with thumbnails, download links, and upload areas across all pages.

Instead of opening an attachment in a new tab (or forcing a full-page download), the plugin injects a preview button next to each image attachment. Clicking it opens an in-page lightbox with navigation between every image on the current page.

## Features

- Lightbox preview for image attachments — no page reload, no new tab.
- Prev / next navigation across all previewable images on the page.
- Keyboard controls: arrow keys to navigate, `Esc` to close.
- Optional enhancement of **existing thumbnails**, so clicking a thumbnail opens the lightbox instead of a new tab.
- Works on `showthread`, private messages, and any page that renders attachments, including the upload area.
- Configurable lightbox width as a percentage of the viewport.
- Master on/off switch that removes both the script and the stylesheet output.
- Stylesheet is registered through PluginLibrary, so CSS lives in MyBB's stylesheet cache rather than a hardcoded `<link>`.

## Requirements

| Requirement | Version / note |
| --- | --- |
| MyBB | 1.8.x (`compatibility: 18*`) |
| PHP | 7.4+ (works on PHP 8.x) |
| PluginLibrary | Required — `inc/plugins/pluginlibrary.php` |

## Installation

1. Extract the repository into your MyBB root (the directory containing `index.php`). Every path here is the real path inside a forum, so nothing needs to be moved afterwards.
2. Go to **Admin CP → Configuration → Plugins**.
3. Find **Attachment Preview** and click **Install**, then **Activate**.
4. Configure it at **Admin CP → Configuration → Settings → Attachment Preview Settings**.

Uninstalling removes the settings group and the cached stylesheet. No database tables are created.

## Plugin structure

```
inc/plugins/attachmentpreview.php                          # plugin bootstrap + hooks
inc/plugins/AttachmentPreview/Assets/preview.css           # lightbox styles (cached via PluginLibrary)
inc/plugins/AttachmentPreview/Assets/preview.js            # lightbox logic, navigation, keyboard
inc/plugins/AttachmentPreview/Templates/attachmentpreview_skel_scripts.html  # injected script block
inc/languages/english/attachmentpreview.lang.php           # front-end phrases
inc/languages/english/admin/attachmentpreview.lang.php     # ACP phrases + setting labels
```

The script block is appended before `</body>` on page output, and only when the plugin is enabled. It reads `attachment.php?aid=…` links already present in the page markup to build the lightbox list, so it does not require any template edits.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Enable Attachment Preview | `1` | Globally enables or disables the feature. When off, no script and no stylesheet are output. |
| Max Preview Width (%) | `90` | Maximum width of the lightbox as a percentage of the viewport. |
| Enhance Existing Thumbnails | `1` | When on, clicking an existing thumbnail opens the lightbox instead of a new tab. |

## Notes

- No template edits are performed and no core files are modified; the plugin works entirely through the `global_start` and `pre_output_page` hooks.
- The stylesheet is stored in MyBB's stylesheet cache by PluginLibrary. Editing `preview.css` on disk requires deactivating and reactivating the plugin to refresh the cache.
- If PluginLibrary is missing, activation and uninstall abort with an Admin CP error message instead of half-installing.

## Author

**PARAD0X** — [MyBB Community profile](https://community.mybb.com/user-134311.html)

- Website: https://mybb.epizy.com
- Version: 1.2.1

## License

GPL-3.0 — see [LICENSE](LICENSE).
