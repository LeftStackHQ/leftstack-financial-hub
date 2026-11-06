# Connect ActBlue

You only need this if you take donations through ActBlue. If you don't, skip to [entering donations by hand](donations.md).

## Add your ActBlue credentials

ActBlue gives your committee a **Client UUID** and a **Client Secret** for connecting other software. If you don't have them, ask ActBlue support how to get them for your committee.

1. Go to **Financial Hub**, then **Settings**, then **Integrations**.
2. Enter the **Client UUID** and **Client Secret**. **Committee ID** is optional.
3. Choose **Save Credentials**.
4. Choose **Test Connection**.

The badge at the top of the tab tells you where you stand: **Not configured**, **Configured**, **Connected**, or **Connection failed**. If it says **Connection failed**, check the two values for stray spaces.

## Pull in your donations

Syncing is always something you start yourself. Nothing is pulled in the background.

1. Go to **Donations** and open the **Disbursements** tab.
2. Choose **Sync ActBlue**.
3. Pick the **Disbursed from** and **Disbursed to** dates. These are deposit dates: the days ActBlue paid the money out to your bank account, not the days donors gave.
4. Choose **Sync Now**.

When it finishes, the Hub tells you how many new contributions it brought in. Donations it already has are skipped, so syncing the same dates twice doesn't create duplicates.

!!! tip "No API access?"
    You can also download a report from ActBlue and use **Import CSV** on the same tab.
