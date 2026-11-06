# Export your state report

The State Report tool writes your contributions into the file format your state's filing site accepts, so you upload the file instead of typing each one. It works for **Tennessee** today.

!!! note "Set your filing state first"
    Go to **Settings**, then **General**, and choose **Tennessee** as the **Filing State**. Without it, the export tool tells you to do this and stops.

## Before you export

1. Run [Before you file](before-you-file.md) for the period and fix what it finds. The check and the export choose their rows the same way, so what the check flags is what would go in the file.
2. On **Donations**, set the filters on the **Transactions** list to the period you're filing. The export uses the filters set on that list.

## Export the file

1. On **Donations**, choose **State Report**.
2. Choose a **Fund Code**. This is the only field in the file that tells the state which election a contribution is for.
    - **All** uses each contribution's own election.
    - **P** stamps every row as the Primary. **G** stamps every row as the General.
    - If your contributions mix elections, the Hub won't let you pick P or G, because the wrong code would file gifts under the wrong election. Choose **All**.
3. Choose who goes in the file under **Contributors**: **Everyone**, **Individuals only**, or **Organizations & PACs only**. Tennessee takes organizations and PACs on a separate schedule from individuals, so the Hub tells you how many of each are in the file.
4. Choose the **Format**: **Tab-delimited** or **CSV**.
5. Read the notes the Hub shows. It counts the contributions, and warns you about any without a full address, with a link to fix them in **Before you file**.
6. Choose **Download**.

## More than 500 contributions

The state site accepts 500 rows per upload. If you have more, the Hub splits the export into files of up to 500. Choose **Download all (ZIP)** to get them together (the button names the number of files), or **Download individually** to get one at a time. Upload each file to the state site.

## What isn't in the file

- In-kind contributions. Export those from the **In-Kind** page.
- Expenses. Use **Export** on **Expenditures** to download your records.

The Hub never sends anything to the state. It gives you the file, and you upload it.
