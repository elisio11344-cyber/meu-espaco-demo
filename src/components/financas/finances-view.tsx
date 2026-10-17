"use client";

import { FormEvent, useMemo, useState } from "react";
import { Field, Modal, PageHeader, fieldClass, primaryButtonClass } from "@/components/app/ui";
import { createId, defaultCurrencies, formatMoney, parseMoney, useLocalCollection, type BankInstitution, type Currency, type FinancialAccount, type Transaction, type UserCurrency } from "@/lib/local-data";
import { calculateAccumulatedTotal } from "@/lib/financas/summary";

const categoryColors: Record<string, string> = { Comida: "#ffd600", Jogos: "#ff9f1c", Aluguel: "#111111", Saúde: "#2ec4b6", Contas: "#7b61ff", Transporte: "#4d96ff", Lazer: "#ff6b6b", Educação: "#7cb518", Renda: "#b8e986", Outros: "#a8a8a8" };
const categories = Object.keys(categoryColors);

export function FinancesView() {
  const [storedTransactions, setTransactions] = useLocalCollection<Transaction>("foco-transactions", []);
  const [accounts, setAccounts] = useLocalCollection<FinancialAccount>("foco-financial-accounts", []);
  const [institutions, setInstitutions] = useLocalCollection<BankInstitution>("foco-bank-institutions", []);
  const [currencyConfigs, setCurrencyConfigs] = useLocalCollection<UserCurrency>("foco-currencies", defaultCurrencies);
  const [currency, setCurrency] = useState<Currency>("AUD");
  const [filter, setFilter] = useState("Todas");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [currenciesOpen, setCurrenciesOpen] = useState(false);
  const [currencyError, setCurrencyError] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const transactions = useMemo(() => storedTransactions.map((item) => ({ ...item, currency: item.currency ?? "BRL", accountId: item.accountId ?? "account-br" })), [storedTransactions]);
  const currencyTransactions = transactions.filter((item) => item.currency === currency);
  const currencyAccounts = accounts.filter((item) => item.currency === currency && item.active);
  const income = currencyTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amountCents, 0);
  const expenses = currencyTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amountCents, 0);
  const accumulatedTotal = calculateAccumulatedTotal(accounts, transactions, currency);
  const expenseByCategory = useMemo(() => Object.entries(currencyTransactions.filter((item) => item.type === "expense").reduce<Record<string, number>>((totals, item) => ({ ...totals, [item.category]: (totals[item.category] ?? 0) + item.amountCents }), {})).sort((a, b) => b[1] - a[1]), [currencyTransactions]);
  const visible = currencyTransactions.filter((item) => filter === "Todas" || item.category === filter).sort((a, b) => b.date.localeCompare(a.date));
  const maxCategory = Math.max(1, ...expenseByCategory.map((entry) => entry[1]));

  function selectCurrency(next: Currency) { setCurrency(next); setFilter("Todas"); }
  function openTransaction(item?: Transaction) { setEditingTransaction(item ?? null); setTransactionOpen(true); }
  function openAccount(item?: FinancialAccount) { setEditingAccount(item ?? null); setAccountOpen(true); }

  function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountCents = parseMoney(String(data.get("amount")));
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    const accountId = String(data.get("accountId"));
    const account = accounts.find((item) => item.id === accountId);
    if (!account || account.currency !== currency) return;
    const item: Transaction = { id: editingTransaction?.id ?? createId("tx"), description: String(data.get("description")), amountCents, type: String(data.get("type")) as Transaction["type"], category: String(data.get("category")), date: String(data.get("date")), notes: String(data.get("notes")), currency, accountId };
    setTransactions((current) => editingTransaction ? current.map((entry) => entry.id === editingTransaction.id ? item : entry) : [item, ...current]);
    setTransactionOpen(false);
  }

  function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const accountCurrency = String(data.get("currency")) as Currency;
    const config = currencyConfigs.find((item) => item.code === accountCurrency);
    if (!config) return;
    const institution: BankInstitution = { id: editingAccount ? (institutions.find((item) => item.id === editingAccount.institutionId)?.id ?? createId("bank")) : createId("bank"), name: String(data.get("institution")), countryCode: config.countryCode, currency: accountCurrency };
    const account: FinancialAccount = { id: editingAccount?.id ?? createId("account"), name: String(data.get("name")), institutionId: institution.id, currency: accountCurrency, initialBalanceCents: parseMoney(String(data.get("initialBalance"))), active: true };
    setInstitutions((current) => current.some((item) => item.id === institution.id) ? current.map((item) => item.id === institution.id ? institution : item) : [institution, ...current]);
    setAccounts((current) => editingAccount ? current.map((item) => item.id === editingAccount.id ? account : item) : [account, ...current]);
    setCurrency(accountCurrency);
    setAccountOpen(false);
  }

  function addCurrency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code")).trim().toUpperCase();
    const name = String(data.get("name")).trim();
    const countryCode = String(data.get("countryCode")).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code) || !/^[A-Z]{2}$/.test(countryCode) || !name) {
      setCurrencyError("Use um código de moeda com 3 letras e um país com 2 letras.");
      return;
    }
    if (currencyConfigs.some((item) => item.code === code)) {
      setCurrencyError("Esta moeda já está cadastrada.");
      return;
    }
    setCurrencyConfigs((items) => [...items, { code, name, countryCode }]);
    setCurrency(code);
    setCurrencyError("");
    event.currentTarget.reset();
  }

  function deleteCurrency(code: Currency) {
    if (currencyConfigs.length === 1) {
      setCurrencyError("Mantenha pelo menos uma moeda cadastrada.");
      return;
    }
    if (accounts.some((item) => item.currency === code) || transactions.some((item) => item.currency === code)) {
      setCurrencyError(`Não é possível excluir ${code} enquanto existirem contas ou movimentações vinculadas.`);
      return;
    }
    const remaining = currencyConfigs.filter((item) => item.code !== code);
    setCurrencyConfigs(remaining);
    setInstitutions((items) => items.filter((item) => item.currency !== code));
    if (currency === code) setCurrency(remaining[0].code);
    setCurrencyError("");
  }

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="Clareza financeira" title="Finanças" description="Contas independentes por moeda, com bancos, etiquetas, histórico e edição completa." action={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => setCurrenciesOpen(true)} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-bold">Gerenciar moedas</button><button type="button" onClick={() => openAccount()} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-bold">+ Conta bancária</button><button type="button" onClick={() => openTransaction()} disabled={currencyAccounts.length === 0} className={primaryButtonClass}>+ Movimentação</button></div>} />

    <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-1">{currencyConfigs.map((item) => <button key={item.code} type="button" onClick={() => selectCurrency(item.code)} aria-pressed={currency === item.code} title={item.name} className={`rounded-xl px-5 py-3 text-sm font-black transition ${currency === item.code ? "bg-[#ffd600] text-black" : "text-black/40 hover:bg-black/5"}`}>{item.code}</button>)}</div><p className="px-3 pb-2 text-xs font-bold text-black/35 sm:pb-0">{currencyAccounts.length} {currencyAccounts.length === 1 ? "conta vinculada" : "contas vinculadas"}</p></div>

    <section className="mt-5 grid gap-4 sm:grid-cols-3"><MoneyCard label={`Total acumulado em ${currency}`} value={formatMoney(accumulatedTotal, currency)} note={`Saldo atual somado de ${currencyAccounts.length} ${currencyAccounts.length === 1 ? "conta" : "contas"}`} accent /><MoneyCard label="Entradas" value={formatMoney(income, currency)} note={`${currencyTransactions.filter((item) => item.type === "income").length} lançamentos`} /><MoneyCard label="Gastos" value={formatMoney(expenses, currency)} note={`${currencyTransactions.filter((item) => item.type === "expense").length} lançamentos`} /></section>

    <section className="mt-6"><div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-black">Contas em {currency}</h2><p className="text-xs font-bold text-black/35">Não há conversão entre moedas</p></div><p className="text-sm font-black">Total das contas: <span className="text-lg">{formatMoney(accumulatedTotal, currency)}</span></p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{currencyAccounts.map((account) => { const bank = institutions.find((item) => item.id === account.institutionId); const accountMovement = currencyTransactions.filter((item) => item.accountId === account.id).reduce((sum, item) => sum + (item.type === "income" ? item.amountCents : -item.amountCents), 0); return <button type="button" onClick={() => openAccount(account)} key={account.id} className="rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:-translate-y-0.5"><div className="flex items-start justify-between"><div><p className="font-black">{account.name}</p><p className="mt-1 text-xs text-black/40">{bank?.name ?? "Instituição"} · {bank?.countryCode}</p></div><span className="text-xs font-bold text-black/35">Editar</span></div><p className="mt-4 text-xl font-black">{formatMoney(account.initialBalanceCents + accountMovement, currency)}</p></button>; })}{currencyAccounts.length === 0 && <p className="rounded-2xl border border-dashed border-black/20 p-6 text-sm text-black/40">Cadastre uma conta em {currency} para começar.</p>}</div></section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-3xl bg-black p-5 text-white sm:p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd600]">Análise por etiqueta · {currency}</p><h2 className="mt-1 text-xl font-black">Onde você mais gasta</h2><div className="mt-7 space-y-5">{expenseByCategory.map(([category, total]) => <button type="button" key={category} onClick={() => setFilter(category)} className="block w-full text-left"><div className="flex items-center justify-between text-sm"><span className="font-bold">{category}</span><span>{formatMoney(total, currency)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${total / maxCategory * 100}%`, backgroundColor: categoryColors[category] ?? categoryColors.Outros }} /></div><p className="mt-1 text-[10px] text-white/35">{expenses ? Math.round(total / expenses * 100) : 0}% dos gastos</p></button>)}</div>{expenseByCategory.length === 0 && <p className="mt-8 text-sm text-white/40">Registre despesas em {currency} para visualizar a distribuição.</p>}</section>
      <section className="overflow-hidden rounded-3xl border border-black/10 bg-white"><div className="flex flex-col gap-3 border-b border-black/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-black/35">Histórico · {currency}</p><h2 className="mt-1 text-xl font-black">Últimas movimentações</h2></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-black/10 bg-[#f6f4ed] px-3 py-2 text-sm font-bold"><option>Todas</option>{Array.from(new Set(currencyTransactions.map((item) => item.category))).sort().map((category) => <option key={category}>{category}</option>)}</select></div><div className="divide-y divide-black/[0.07]">{visible.map((item) => <article key={item.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="h-10 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[item.category] ?? categoryColors.Outros }} /><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{item.description}</h3><p className="mt-1 truncate text-xs text-black/40"><span className="font-bold">{item.category}</span> · {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}{item.notes && ` · ${item.notes}`}</p></div><p className={`shrink-0 text-sm font-black ${item.type === "expense" ? "text-black" : "text-emerald-700"}`}>{item.type === "expense" ? "−" : "+"} {formatMoney(item.amountCents, currency)}</p><button type="button" onClick={() => openTransaction(item)} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold">Editar</button></article>)}{visible.length === 0 && <p className="p-12 text-center text-sm text-black/40">Nenhuma movimentação nesta moeda.</p>}</div></section></div>

    <Modal open={transactionOpen} onClose={() => setTransactionOpen(false)} title={editingTransaction ? "Editar movimentação" : `Registrar em ${currency}`} description="A moeda é definida pela conta e não será misturada com outros saldos."><form onSubmit={saveTransaction} className="grid gap-5 sm:grid-cols-2"><Field label="Tipo"><select className={fieldClass} name="type" defaultValue={editingTransaction?.type}><option value="expense">Despesa</option><option value="income">Entrada</option></select></Field><Field label={`Valor em ${currency}`}><input className={fieldClass} name="amount" required inputMode="decimal" defaultValue={editingTransaction ? (editingTransaction.amountCents / 100).toFixed(2).replace(".", ",") : ""} placeholder="0,00" /></Field><div className="sm:col-span-2"><Field label="Descrição"><input className={fieldClass} name="description" required defaultValue={editingTransaction?.description} placeholder="Ex.: Compras no mercado" /></Field></div><Field label="Conta"><select className={fieldClass} name="accountId" required defaultValue={editingTransaction?.accountId}>{currencyAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field><Field label="Etiqueta"><input className={fieldClass} name="category" required list="finance-categories" defaultValue={editingTransaction?.category} placeholder="Comida, aluguel..."/><datalist id="finance-categories">{categories.map((category) => <option key={category} value={category}/>)}</datalist></Field><Field label="Data"><input className={fieldClass} name="date" type="date" required defaultValue={editingTransaction?.date ?? new Date().toISOString().slice(0, 10)} /></Field><Field label="Observação"><input className={fieldClass} name="notes" defaultValue={editingTransaction?.notes} placeholder="Opcional" /></Field><div className="flex items-center justify-between border-t border-black/10 pt-5 sm:col-span-2">{editingTransaction ? <button type="button" onClick={() => { setTransactions((items) => items.filter((entry) => entry.id !== editingTransaction.id)); setTransactionOpen(false); }} className="text-sm font-bold text-red-700">Excluir</button> : <span/>}<div className="flex gap-3"><button type="button" onClick={() => setTransactionOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar</button></div></div></form></Modal>

    <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title={editingAccount ? "Editar conta bancária" : "Cadastrar banco e conta"} description="Cada conta pertence a um país e a uma única moeda."><form onSubmit={saveAccount} className="grid gap-5 sm:grid-cols-2"><Field label="Nome da conta"><input className={fieldClass} name="name" required defaultValue={editingAccount?.name} placeholder="Ex.: Conta do dia a dia" /></Field><Field label="Instituição"><input className={fieldClass} name="institution" required defaultValue={institutions.find((item) => item.id === editingAccount?.institutionId)?.name} placeholder="Ex.: Commonwealth Bank" /></Field><Field label="Moeda / país"><select className={fieldClass} name="currency" defaultValue={editingAccount?.currency ?? currency}>{currencyConfigs.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></Field><Field label="Saldo inicial"><input className={fieldClass} name="initialBalance" required inputMode="decimal" defaultValue={editingAccount ? (editingAccount.initialBalanceCents / 100).toFixed(2).replace(".", ",") : "0,00"} /></Field><div className="flex items-center justify-between border-t border-black/10 pt-5 sm:col-span-2">{editingAccount ? <button type="button" onClick={() => { setAccounts((items) => items.map((item) => item.id === editingAccount.id ? { ...item, active: false } : item)); setAccountOpen(false); }} className="text-sm font-bold text-red-700">Arquivar conta</button> : <span/>}<div className="flex gap-3"><button type="button" onClick={() => setAccountOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold">Cancelar</button><button className={primaryButtonClass}>Salvar conta</button></div></div></form></Modal>

    <Modal open={currenciesOpen} onClose={() => { setCurrenciesOpen(false); setCurrencyError(""); }} title="Gerenciar moedas" description="Adicione moedas pelo código ISO. Uma moeda com dados vinculados não pode ser excluída."><div className="space-y-5"><div className="space-y-2">{currencyConfigs.map((item) => <div key={item.code} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4"><span className="grid h-11 w-14 place-items-center rounded-xl bg-[#ffd600] text-sm font-black text-black">{item.code}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.name}</p><p className="text-xs text-black/40">País: {item.countryCode}</p></div><button type="button" onClick={() => deleteCurrency(item.code)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-700">Excluir</button></div>)}</div>{currencyError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{currencyError}</p>}<form onSubmit={addCurrency} className="grid gap-4 border-t border-black/10 pt-5 sm:grid-cols-2"><Field label="Código da moeda"><input className={fieldClass} name="code" required maxLength={3} placeholder="EUR" /></Field><Field label="País"><input className={fieldClass} name="countryCode" required maxLength={2} placeholder="DE" /></Field><div className="sm:col-span-2"><Field label="Nome"><input className={fieldClass} name="name" required placeholder="Euro" /></Field></div><button className={`${primaryButtonClass} sm:col-span-2`}>Adicionar moeda</button></form></div></Modal>
  </div>;
}

function MoneyCard({ label, value, note, accent = false }: { label: string; value: string; note?: string; accent?: boolean }) { return <article className={`rounded-2xl border border-black/10 p-5 ${accent ? "bg-[#ffd600]" : "bg-white"}`}><p className="text-xs font-bold uppercase tracking-wider text-black/40">{label}</p><p className="mt-2 text-3xl font-black tracking-tight">{value}</p>{note && <p className="mt-2 text-xs text-black/40">{note}</p>}</article>; }
