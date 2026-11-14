<?php
if(!defined("IN_MYBB"))
{
    die("Direct initialization of this file is not allowed.");
}

if(!defined("PLUGINLIBRARY"))
{
    define("PLUGINLIBRARY", MYBB_ROOT . "inc/plugins/pluginlibrary.php");
}

define("ATTACHMENTPREVIEW_ROOT", MYBB_ROOT . "inc/plugins/AttachmentPreview/");

$plugins->add_hook("pre_output_page", "attachmentpreview_pre_output_page");
$plugins->add_hook("global_start", "attachmentpreview_global_start");

function attachmentpreview_info()
{
    global $lang;
    $lang->load("attachmentpreview");

    return array(
        "name"          => "Attachment Preview",
        "description"   => $lang->attachmentpreview_plugin_desc ?? "Adds a preview button to image attachments for quick viewing in a lightbox overlay. Supports prev/next navigation, keyboard controls, and works seamlessly with thumbnails, download links, and upload areas across all pages.",
        "website"       => "https://mybb.epizy.com",
        "author"        => "PARADOX",
        "authorsite"    => "https://community.mybb.com/user-134311.html",
        "version"       => "1.2.1",
        "compatibility" => "18*",
        "codename"      => "attachmentpreview"
    );
}

function attachmentpreview_is_installed()
{
    global $db;
    $query = $db->simple_select("settinggroups", "gid", "name='attachmentpreview'");
    return (bool)$db->fetch_field($query, "gid");
}

function attachmentpreview_install()
{
}

function attachmentpreview_uninstall()
{
    global $PL;

    if(!file_exists(PLUGINLIBRARY))
    {
        flash_message("PluginLibrary is required to uninstall this plugin.", "error");
        admin_redirect("index.php?module=config-plugins");
        exit;
    }

    require_once PLUGINLIBRARY;
    $PL = new PluginLibrary();
    $PL->settings_delete("attachmentpreview");
}

function attachmentpreview_activate()
{
    if(!file_exists(PLUGINLIBRARY))
    {
        flash_message("PluginLibrary is required to activate this plugin.", "error");
        admin_redirect("index.php?module=config-plugins");
        exit;
    }

    global $lang;
    $lang->load("attachmentpreview", true);

    require_once PLUGINLIBRARY;
    $PL = new PluginLibrary();

    $PL->settings(
        "attachmentpreview",
        $lang->setting_group_attachmentpreview,
        $lang->setting_group_attachmentpreview_desc,
        array(
            "enabled" => array(
                "title"       => $lang->setting_attachmentpreview_enabled,
                "description" => $lang->setting_attachmentpreview_enabled_desc,
                "optionscode" => "yesno",
                "value"       => "1"
            ),
            "max_width" => array(
                "title"       => $lang->setting_attachmentpreview_max_width,
                "description" => $lang->setting_attachmentpreview_max_width_desc,
                "optionscode" => "text",
                "value"       => "90"
            ),
            "existing_thumbnails" => array(
                "title"       => $lang->setting_attachmentpreview_existing_thumbnails,
                "description" => $lang->setting_attachmentpreview_existing_thumbnails_desc,
                "optionscode" => "yesno",
                "value"       => "1"
            )
        )
    );

    $css_path = ATTACHMENTPREVIEW_ROOT . "Assets/preview.css";
    if(file_exists($css_path))
    {
        $css = @file_get_contents($css_path);
        if($css !== false)
        {
            $PL->stylesheet("attachmentpreview", $css);
        }
    }
}

function attachmentpreview_deactivate()
{
    global $PL;

    if(!file_exists(PLUGINLIBRARY))
    {
        return;
    }

    require_once PLUGINLIBRARY;
    $PL = new PluginLibrary();
    $PL->stylesheet_delete("attachmentpreview", true);
}

function attachmentpreview_global_start()
{
    global $mybb, $lang;

    if(!isset($mybb->settings['attachmentpreview_enabled']) || $mybb->settings['attachmentpreview_enabled'] != 1)
    {
        return;
    }

    $lang->load("attachmentpreview");
}

function attachmentpreview_load_skel($template_name)
{
    static $template_cache = array();

    if(isset($template_cache[$template_name]))
    {
        return $template_cache[$template_name];
    }

    $template_path = ATTACHMENTPREVIEW_ROOT . 'Templates/' . $template_name . '.html';

    if(file_exists($template_path))
    {
        $content = @file_get_contents($template_path);
        if($content !== false)
        {
            $template_cache[$template_name] = $content;
            return $content;
        }
    }

    return '';
}

function attachmentpreview_pre_output_page(&$page)
{
    global $mybb, $lang;

    if(!isset($mybb->settings['attachmentpreview_enabled']) || $mybb->settings['attachmentpreview_enabled'] != 1)
    {
        return;
    }

    $scripts_html = attachmentpreview_load_skel('attachmentpreview_skel_scripts');
    if(empty($scripts_html))
    {
        return;
    }

    $config = array(
        'bburl' => $mybb->settings['bburl'],
        'lang' => array(
            'preview' => $lang->attachmentpreview_preview ?? 'Preview',
            'close' => $lang->attachmentpreview_close ?? 'Close (Esc)',
            'loading' => $lang->attachmentpreview_loading ?? 'Loading preview...'
        ),
        'maxWidth' => (int)($mybb->settings['attachmentpreview_max_width'] ?? 90),
        'enhanceThumbs' => (int)($mybb->settings['attachmentpreview_existing_thumbnails'] ?? 1)
    );
    $config_json = json_encode($config);

    $scripts_html = str_replace('{bburl}', $mybb->settings['bburl'], $scripts_html);
    $scripts_html = str_replace(
        '{config}',
        '<script>
var AttachmentPreviewConfig = ' . $config_json . ';</script>',
        $scripts_html
    );

    $page = str_replace('</body>', $scripts_html . "\n</body>", $page);
}