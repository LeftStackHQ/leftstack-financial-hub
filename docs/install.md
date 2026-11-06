# Install the plugin

## Download

1. Go to the [Releases page](https://github.com/LeftStackHQ/leftstack-financial-hub/releases) of the Hub's GitHub project.
2. Under the newest release, download the file named `leftstack-financial-hub-` followed by the version number and `.zip`. Don't unzip it.

## Install it in WordPress

1. In WordPress, go to **Plugins** and choose **Add New Plugin**.
2. Choose **Upload Plugin**, pick the zip file, and choose **Install Now**.
3. Choose **Activate Plugin**.

A **Financial Hub** item now appears in the left-hand menu.

!!! tip "On a WordPress network?"
    If your site is part of a multisite network, a network administrator installs the plugin and activates it for the network or for your site.

## Let your team in

Anyone who should work in the Hub needs access. Go to **Financial Hub**, then **Settings**, then **Staff Access**. Under **Grant Access**, search for the person by name or email and choose them. They can work in the Hub without getting full WordPress admin rights. Administrators always have access.

## Deleting the plugin

Your records are legal records, so deleting the plugin from the **Plugins** screen does not delete them. The donations, expenses, and settings stay in your database, and they are all there if you install the plugin again. To remove everything for good, add this line to `wp-config.php` before you delete the plugin:

```php
define( 'LSFH_REMOVE_DATA_ON_UNINSTALL', true );
```

Next: [first-time setup](setup.md).
