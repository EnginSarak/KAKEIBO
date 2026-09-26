<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/kakeibo-logo-dark.svg"/>
  <source media="(prefers-color-scheme: light)" srcset="frontend/public/kakeibo-logo-light.svg"/>
  <img src="frontend/public/kakeibo-logo-light.svg" alt="KAKEIBO" height="48"/>
</picture>

# KAKEIBO

**Version 1.1.0**

*A personal budgeting app built on the Japanese kakeibo method,<br/>for dividing your money up before you spend it*

*Built by [Engin Sarak](https://github.com/EnginSarak)*

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)
![Status](https://img.shields.io/badge/status-Active-brightgreen)

**[kakeibo.enginsarak.com](https://kakeibo.enginsarak.com)**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Dashboard](#dashboard)
  - [Accounts](#accounts)
  - [Budgets](#budgets)
  - [Intervals and Resets](#intervals-and-resets)
  - [Transactions](#transactions)
  - [Untagged Transactions](#untagged-transactions)
  - [Transaction History](#transaction-history)
  - [Adjusting a Budget Directly](#adjusting-a-budget-directly)
  - [Languages and Currencies](#languages-and-currencies)
  - [Demo Mode](#demo-mode)
  - [Theming](#theming)
  - [Built for Phones](#built-for-phones)
- [Account and Data](#account-and-data)
- [Setup](#setup)
- [Changelog](#changelog)

---

## Overview

KAKEIBO is a personal budgeting app. Your bank balance tells you how much money is there. It does not tell you how much of that is already spoken for. KAKEIBO splits the money into budgets first, so the number you look at is the one you can actually spend.

It is built for daily use on a phone and covers:

- Keeping track of several accounts and their combined balance
- Splitting that money into budgets for the things you spend on
- Separating costs that come round every month from savings that build up over time
- Recording income and expenses and assigning them to a budget
- Seeing what is left in each budget before you spend, not after
- Searching and filtering the full history of what you spent and when
- Working in five languages and five currencies

---

## Features

### Dashboard

The dashboard is the first screen after login and holds everything on one page.

**Total Balance**
A card at the top showing the combined balance of all your accounts, with the number counting up as it loads. Below it sits the number of accounts and the total currently tied up in budgets, so you can see at a glance how much of your money is already assigned. Tapping the card opens your transactions.

**Budget Lists**
Two sections, one for each budget type, each with its own running total. Every budget is a card showing its name, a colored avatar with its initials, the amount still left, and a progress bar. The bar shifts color as an expense budget empties, and the remaining amount turns red once a budget goes negative.

**Recent Transactions**
The last five entries, newest first. Tapping one opens it for editing, and the arrow next to the heading opens the full history.

**Edit Mode**
The pencil icon in the header switches the dashboard into edit mode. Budget cards can then be dragged into a different order, and tapping one opens it for editing instead of opening its transactions.

**Add Button**
The floating button in the bottom right opens a new transaction. If you have not created an account yet, it opens the account form first.

---

### Accounts

An account has a name, a starting balance and a color. You can create as many as you like, for example one for a current account and one for savings. The total balance on the dashboard is the sum of all of them, and every transaction is booked against one specific account.

Deleting an account also deletes the budgets and transactions belonging to it, so the app asks for confirmation first.

---

### Budgets

A budget is a pot of money set aside for one purpose. It has a name, an amount, a color and an interval. There are two kinds, and they behave differently on purpose:

| Type | What it is for | What happens each interval |
|---|---|---|
| **Expense budget** | Costs that come round again, such as rent, groceries or your phone bill | Starts over at the full amount |
| **Accumulating budget** | Things you save up for, such as a holiday, a car or a reserve | The amount is added on top of what is already there |

Each budget card shows what is left rather than what has been spent, since that is the number you need before deciding whether you can afford something. For expense budgets the progress bar shows how much of the budget is still available and changes color as it runs down. For accumulating budgets it shows how the pot is filling up.

Budgets can be reordered by dragging them in edit mode, so the ones you check most often sit at the top.

---

### Intervals and Resets

Every budget runs on an interval, set when you create it along with a start date: daily, weekly, monthly, quarterly, yearly, or none for a one-time budget that never resets.

When an interval passes, the app handles it by itself the next time you open it, including several intervals at once if you have not opened the app for a while. An expense budget starts over at its full amount. An accumulating budget adds its amount again, so a monthly saving of 100 stands at 300 after three months, minus whatever you took out of it.

Picking "None" turns off the start date field, since a one-time budget has nothing to reset to.

---

### Transactions

A transaction is a single expense or income entry. It carries:

- **Type**: expense or income, chosen with a toggle at the top
- **Amount**, typed in naturally with the currency formatting applied as you type
- **Name**, a short description
- **Account**, which account the money moves through
- **Budget**, optional, which budget it counts against
- **Date**

Assigning a transaction to a budget is what makes it count. An expense reduces what is left in that budget, and an income adds to it. Because income is not capped, a budget can end up holding more than its own amount, which is what you want when money comes back in.

---

### Untagged Transactions

A transaction does not need a budget. If you leave it unassigned, it still shows up in the history and can be filtered out on its own with the "Without budget" filter, so it stays visible until you decide where it belongs. Nothing disappears just because you were in a hurry when you entered it.

---

### Transaction History

The full list, newest first, grouped by day with a heading giving the weekday and date. It loads in pages rather than all at once, with controls at the bottom to move through them.

Three ways to narrow it down, which can be combined:

- **Search** by name, filtering as you type
- **Filter by date** with a calendar picker
- **Without budget** to see only the entries you have not assigned yet

A button clears all active filters at once. Tapping a budget on the dashboard opens the same list already filtered to that budget, so you can see exactly what went through it.

---

### Adjusting a Budget Directly

Opening a budget for editing shows a "Current standing" field alongside the budget amount. Typing a new number there sets what is left in that budget straight away, without creating a transaction and without touching any account balance. It is there for correcting a budget that has drifted out of line with reality, rather than booking a fake expense to make the numbers match.

---

### Languages and Currencies

The app is fully translated into five languages: German, English, Spanish, French and Italian. On first visit it picks the one matching your browser, and it can be changed at any time in the settings.

Five currencies are supported, each formatted the way it is actually written rather than just swapping the symbol:

| Currency | Example |
|---|---|
| Euro | `1.234,56 €` |
| US Dollar | `$1,234.56` |
| Swiss Franc | `1'234.56 CHF` |
| British Pound | `£1,234.56` |
| Japanese Yen | `¥1,235` |

Thousand separators, decimal separators and the position of the symbol follow the currency, and the yen is handled without decimals.

---

### Demo Mode

The app can be tried without signing up. Demo data lives only in your own browser and is never sent anywhere, so nothing needs to be deleted afterwards. It is limited to ten transactions, which is enough to see how budgets and tagging work. Leaving demo mode clears the local data.

---

### Theming

The app follows your device setting by default and switches to dark mode when your phone does. A switch in the settings overrides it and keeps light or dark permanently. The choice is remembered.

---

### Built for Phones

The interface is built for one hand on a phone screen, with the add button in reach of your thumb and everything on a single scrolling page. Opening it on a desktop browser shows a short notice pointing you to your phone instead of a stretched layout.

---

## Account and Data

Signing up takes an email address and a password. The address has to be confirmed before the account can be used: the app sends a link, and the page updates on its own once you have clicked it. A forgotten password can be reset by email.

The settings let you change your display name, email address and password, with the current password required for the last two. An account can be deleted permanently, which needs the word "delete" typed out in your language as confirmation.

Data belonging to an account is stored per user and is only readable by that user. Demo data never leaves the browser it was entered in.


---

## Changelog

### 1.1.0 (2026-09-26)

#### Added
- Bank Sync, in beta and switched on for a small number of accounts. Transactions and account balance is taken from the bank on every sync.

---

### 1.0.1 (2026-09-23)

#### Fixed
- Minor bug fixes.

---

<div align="center">

*Built by [Engin Sarak](https://github.com/EnginSarak)*

</div>
