# Tie your records to the bank

Bank tie-out compares your bank statement with what you've entered in the Hub, line by line. It shows what matches, what's missing on either side, and which checks haven't cleared. You do it a little at a time, usually once a month.

!!! note "Your account number is never kept"
    You upload a CSV your bank lets you download. The file is read in your browser, and only each line's date, amount, description, and check number are sent to your site and saved. Account numbers are never stored.

## Add a bank file

1. Go to **Bank**.
2. Under **Bank account**, choose **+ Add a bank account** and give it a name you'll recognize, such as "US Bank checking". You only do this once per account.
3. Choose **Add a bank file**, then **Choose CSV file**. The first row of the file must be column names.

## Check the layout

Banks lay out their files differently, so the Hub asks you to confirm how to read yours:

- **Date column** and **Date format**.
- **How amounts are given**: one column where money out is negative, separate debit and credit columns, or an amount plus a debit/credit type column.

Then compare the totals the Hub shows (**Lines in file**, **First and last** date, **Money in**, and **Money out**) with your bank statement. If they differ, the layout is wrong, so fix it before you go on. When the totals agree, choose **Looks right, add these lines**.

The Hub remembers the layout for that account, so next time you only upload the file.

Here you can also type the names your bank prints on deposits from ActBlue, Stripe, or another payout service, separated by commas, so the Hub can recognize those deposits.

## Work through the tabs

Each bank line and Hub record has an arrow: green for money in, red for money out. Lists are grouped under **Money in** and **Money out**, each with a count and total.

**Review** shows **Suggested matches**. The box **Fill blank dates from the bank** is ticked by default. It fills an empty Date Received, Posted date, or Date Deposited from the bank's date when you confirm. A date you typed yourself is never changed. Untick it if you don't want that.

- The first group has exactly one possible partner at the exact amount, inside the date window. Untick any you don't want, then confirm.
- A second group adds up but involves more than one record, so look before you confirm. Tick only the ones that are right.
- Below that are **to-do cards** for bank lines with no clear partner. Each card says what's going on and offers **Add to Hub** (to create the missing record), **Confirm this pairing**, or **Match by hand**.

**Match by hand** lets you pick bank lines and Hub records and confirm that they belong together. If the totals differ, it asks why, and the reason is saved as a known difference.

**Matched** lists **Confirmed matches** with any difference. **Undo** takes one back, and it only reverses what the match itself set.

**Not at the bank** lists records the bank hasn't shown yet:

- **Outstanding checks** are checks whose number you typed in the Hub. Each stays here, oldest first, until a bank line is matched to it.
- **Other records without a bank line** are records with no matching deposit or withdrawal. Most of the time, nothing is wrong. They're paid some other way or haven't cleared.

When a match is confirmed, the Hub marks the record **Balanced to Bank Statement** for you, and fills in blank dates unless you unticked that box, so you don't have to do it twice.

Next: [before you file](before-you-file.md).
