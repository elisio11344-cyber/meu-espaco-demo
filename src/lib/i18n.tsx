"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "pt" | "en" | "es";

type Translation = { en: string; es: string };

const translations: Record<string, Translation> = {
  "Visão geral": { en: "Overview", es: "Resumen" },
  "Agenda": { en: "Calendar", es: "Agenda" },
  "Hábitos": { en: "Habits", es: "Hábitos" },
  "Notas": { en: "Notes", es: "Notas" },
  "Metas": { en: "Goals", es: "Metas" },
  "Finanças": { en: "Finances", es: "Finanzas" },
  "Recompensas": { en: "Rewards", es: "Recompensas" },
  "Minha conta": { en: "My account", es: "Mi cuenta" },
  "Hoje": { en: "Today", es: "Hoy" },
  "Organize. Faça. Evolua.": { en: "Organize. Act. Evolve.", es: "Organiza. Actúa. Evoluciona." },
  "Modo local": { en: "Local mode", es: "Modo local" },
  "Modo de demonstração": { en: "Demo mode", es: "Modo de demostración" },
  "Demonstração local. Os dados ficam somente neste navegador.": { en: "Local demo. Data stays in this browser.", es: "Demo local. Los datos permanecen en este navegador." },
  "Escuro": { en: "Dark", es: "Oscuro" },
  "Claro": { en: "Light", es: "Claro" },
  "Tutorial": { en: "Tutorial", es: "Tutorial" },
  "Olá, vamos focar?": { en: "Hello, ready to focus?", es: "Hola, ¿listo para enfocarte?" },
  "Aqui está o que importa hoje. Um passo de cada vez.": { en: "Here is what matters today. One step at a time.", es: "Esto es lo que importa hoy. Un paso a la vez." },
  "+ Novo hábito": { en: "+ New habit", es: "+ Nuevo hábito" },
  "Hábitos concluídos": { en: "Habits completed", es: "Hábitos completados" },
  "Sequência atual": { en: "Current streak", es: "Racha actual" },
  "Maior sequência ativa": { en: "Longest active streak", es: "Mayor racha activa" },
  "Metas em andamento": { en: "Goals in progress", es: "Metas en curso" },
  "Acompanhe seus objetivos": { en: "Track your goals", es: "Sigue tus objetivos" },
  "Carteira de pontos": { en: "Points wallet", es: "Cartera de puntos" },
  "Use em recompensas": { en: "Spend on rewards", es: "Úsalos en recompensas" },
  "Patrimônio total convertido": { en: "Converted total net worth", es: "Patrimonio total convertido" },
  "Exibir patrimônio em": { en: "Display net worth in", es: "Mostrar patrimonio en" },
  "Atualizando a cotação mais recente…": { en: "Updating the latest rates…", es: "Actualizando las últimas cotizaciones…" },
  "Cotação indisponível. Seus saldos individuais continuam disponíveis abaixo.": { en: "Rates unavailable. Individual balances remain available below.", es: "Cotización no disponible. Los saldos individuales siguen disponibles abajo." },
  "Rotina de hoje": { en: "Today's routine", es: "Rutina de hoy" },
  "Seus hábitos": { en: "Your habits", es: "Tus hábitos" },
  "Gerenciar hábitos": { en: "Manage habits", es: "Gestionar hábitos" },
  "Ritmo semanal": { en: "Weekly rhythm", es: "Ritmo semanal" },
  "Consistência": { en: "Consistency", es: "Constancia" },
  "Esta semana": { en: "This week", es: "Esta semana" },
  "mais consistente que na semana passada": { en: "more consistent than last week", es: "más constante que la semana pasada" },
  "Brain": { en: "Brain", es: "Cerebro" },
  "Suas ideias interligadas": { en: "Your connected ideas", es: "Tus ideas conectadas" },
  "Explore as relações entre notas, assuntos e projetos.": { en: "Explore relationships between notes, topics and projects.", es: "Explora relaciones entre notas, temas y proyectos." },
  "Abrir Brain completo →": { en: "Open full Brain →", es: "Abrir Cerebro completo →" },
  "Suas obrigações": { en: "Your commitments", es: "Tus compromisos" },
  "Nenhuma obrigação para hoje.": { en: "No commitments today.", es: "No hay compromisos para hoy." },
  "Abrir agenda completa": { en: "Open full calendar", es: "Abrir agenda completa" },
  "Segundo cérebro": { en: "Second brain", es: "Segundo cerebro" },
  "Registre ideias, edite livremente e conecte uma nota à outra para revelar relações no seu Brain.": { en: "Capture ideas, edit freely and connect notes to reveal relationships in your Brain.", es: "Registra ideas, edita libremente y conecta notas para revelar relaciones en tu Cerebro." },
  "+ Nova nota": { en: "+ New note", es: "+ Nueva nota" },
  "Todas as notas": { en: "All notes", es: "Todas las notas" },
  "Buscar notas ou etiquetas...": { en: "Search notes or tags...", es: "Buscar notas o etiquetas..." },
  "Mapa de conhecimento": { en: "Knowledge graph", es: "Mapa de conocimiento" },
  "Seu Brain": { en: "Your Brain", es: "Tu Cerebro" },
  "Notas importantes aparecem como estrelas no mapa.": { en: "Important notes appear as stars on the graph.", es: "Las notas importantes aparecen como estrellas en el mapa." },
  "Crie notas e conecte-as para formar seu Brain.": { en: "Create and connect notes to build your Brain.", es: "Crea y conecta notas para formar tu Cerebro." },
  "Nota selecionada": { en: "Selected note", es: "Nota seleccionada" },
  "Fixar": { en: "Pin", es: "Fijar" },
  "Importante": { en: "Important", es: "Importante" },
  "Editar": { en: "Edit", es: "Editar" },
  "Excluir": { en: "Delete", es: "Eliminar" },
  "Cancelar": { en: "Cancel", es: "Cancelar" },
  "Salvar": { en: "Save", es: "Guardar" },
  "Salvar nota": { en: "Save note", es: "Guardar nota" },
  "Nenhuma nota encontrada.": { en: "No notes found.", es: "No se encontraron notas." },
  "Criar uma nota": { en: "Create a note", es: "Crear una nota" },
  "Editar nota": { en: "Edit note", es: "Editar nota" },
  "Título": { en: "Title", es: "Título" },
  "Conteúdo": { en: "Content", es: "Contenido" },
  "Etiquetas": { en: "Tags", es: "Etiquetas" },
  "Descrição": { en: "Description", es: "Descripción" },
  "Data": { en: "Date", es: "Fecha" },
  "Observação": { en: "Note", es: "Observación" },
  "Opcional": { en: "Optional", es: "Opcional" },
  "Fixar no dashboard": { en: "Pin to dashboard", es: "Fijar en el panel" },
  "Marcar importante": { en: "Mark as important", es: "Marcar como importante" },
  "Conectar com": { en: "Connect with", es: "Conectar con" },
  "Novo registro": { en: "New entry", es: "Nuevo registro" },
  "Fechar": { en: "Close", es: "Cerrar" },
  "Próximo": { en: "Next", es: "Siguiente" },
  "Anterior": { en: "Previous", es: "Anterior" },
  "Concluir tutorial": { en: "Finish tutorial", es: "Finalizar tutorial" },
  "Progresso do tutorial": { en: "Tutorial progress", es: "Progreso del tutorial" },
  "Clareza financeira": { en: "Financial clarity", es: "Claridad financiera" },
  "Gerenciar moedas": { en: "Manage currencies", es: "Gestionar monedas" },
  "+ Conta bancária": { en: "+ Bank account", es: "+ Cuenta bancaria" },
  "+ Movimentação": { en: "+ Transaction", es: "+ Movimiento" },
  "Entradas": { en: "Income", es: "Ingresos" },
  "Gastos": { en: "Expenses", es: "Gastos" },
  "Onde você mais gasta": { en: "Where you spend most", es: "Dónde gastas más" },
  "Últimas movimentações": { en: "Latest transactions", es: "Últimos movimientos" },
  "Todas": { en: "All", es: "Todas" },
  "Nenhuma movimentação nesta moeda.": { en: "No transactions in this currency.", es: "No hay movimientos en esta moneda." },
  "Despesa": { en: "Expense", es: "Gasto" },
  "Entrada": { en: "Income", es: "Ingreso" },
  "Conta": { en: "Account", es: "Cuenta" },
  "Tipo": { en: "Type", es: "Tipo" },
  "Valor": { en: "Amount", es: "Valor" },
  "Nome da conta": { en: "Account name", es: "Nombre de la cuenta" },
  "Instituição": { en: "Institution", es: "Institución" },
  "Saldo inicial": { en: "Opening balance", es: "Saldo inicial" },
  "Salvar conta": { en: "Save account", es: "Guardar cuenta" },
  "Arquivar conta": { en: "Archive account", es: "Archivar cuenta" },
  "Adicionar moeda": { en: "Add currency", es: "Agregar moneda" },
  "Código da moeda": { en: "Currency code", es: "Código de moneda" },
  "País": { en: "Country", es: "País" },
  "Construir constância": { en: "Build consistency", es: "Construye constancia" },
  "Novo hábito": { en: "New habit", es: "Nuevo hábito" },
  "Concluir": { en: "Complete", es: "Completar" },
  "Transforme planos em progresso": { en: "Turn plans into progress", es: "Convierte planes en progreso" },
  "+ Nova meta": { en: "+ New goal", es: "+ Nueva meta" },
  "Meta importante": { en: "Important goal", es: "Meta importante" },
  "Concluir meta": { en: "Complete goal", es: "Completar meta" },
  "Use seus pontos": { en: "Use your points", es: "Usa tus puntos" },
  "+ Nova recompensa": { en: "+ New reward", es: "+ Nueva recompensa" },
  "Comprar": { en: "Redeem", es: "Canjear" },
  "Histórico de pontos": { en: "Points history", es: "Historial de puntos" },
  "Preferências e segurança": { en: "Preferences and security", es: "Preferencias y seguridad" },
  "Perfil": { en: "Profile", es: "Perfil" },
  "Dados pessoais": { en: "Personal details", es: "Datos personales" },
  "Nome": { en: "Name", es: "Nombre" },
  "Fuso horário": { en: "Time zone", es: "Zona horaria" },
  "Salvar perfil": { en: "Save profile", es: "Guardar perfil" },
  "Sair da conta": { en: "Sign out", es: "Cerrar sesión" },
  "Alterar e-mail": { en: "Change email", es: "Cambiar correo" },
  "Alterar senha": { en: "Change password", es: "Cambiar contraseña" },
  "E-mail": { en: "Email", es: "Correo electrónico" },
  "Senha": { en: "Password", es: "Contraseña" },
  "Entrar": { en: "Sign in", es: "Entrar" },
  "Criar conta": { en: "Create account", es: "Crear cuenta" },
  "Bem-vindo de volta": { en: "Welcome back", es: "Bienvenido de nuevo" },
  "Crie seu espaço": { en: "Create your space", es: "Crea tu espacio" },
  "Acesso privado": { en: "Private access", es: "Acceso privado" },
  "Sua conta": { en: "Your account", es: "Tu cuenta" },
  "Entre para acessar seu espaço pessoal.": { en: "Sign in to access your personal space.", es: "Inicia sesión para acceder a tu espacio personal." },
  "Comece com seu e-mail e uma senha segura.": { en: "Start with your email and a secure password.", es: "Comienza con tu correo y una contraseña segura." },
  "Confirme sua senha": { en: "Confirm your password", es: "Confirma tu contraseña" },
  "Use pelo menos 8 caracteres.": { en: "Use at least 8 characters.", es: "Usa al menos 8 caracteres." },
  "Aguarde…": { en: "Please wait…", es: "Espera…" },
  "Já tem uma conta?": { en: "Already have an account?", es: "¿Ya tienes una cuenta?" },
  "Ainda não tem uma conta?": { en: "Don't have an account yet?", es: "¿Aún no tienes una cuenta?" },
  "Um espaço privado para organizar sua vida.": { en: "A private space to organize your life.", es: "Un espacio privado para organizar tu vida." },
  "Meu espaço": { en: "My space", es: "Mi espacio" },
  "Idioma da interface": { en: "Interface language", es: "Idioma de la interfaz" },
  "Diminuir zoom": { en: "Zoom out", es: "Alejar" },
  "Aumentar zoom": { en: "Zoom in", es: "Acercar" },
  "Centralizar mapa": { en: "Center graph", es: "Centrar mapa" },
  "Mapa de conexões entre notas": { en: "Graph of connections between notes", es: "Mapa de conexiones entre notas" },
  "Arraste para mover · role para ampliar": { en: "Drag to move · scroll to zoom", es: "Arrastra para mover · desplázate para ampliar" },
  "conexões": { en: "connections", es: "conexiones" },
  "importante": { en: "important", es: "importante" },
  "Pular para o conteúdo": { en: "Skip to content", es: "Saltar al contenido" },
  "Captura inteligente": { en: "Smart capture", es: "Captura inteligente" },
  "Conte o que aconteceu. Eu organizo.": { en: "Tell me what happened. I'll organize it.", es: "Cuéntame qué pasó. Yo lo organizo." },
  "Escreva como você falaria. Eu organizo a informação no lugar certo.": { en: "Write naturally. I'll organize the information in the right place.", es: "Escribe con naturalidad. Yo organizo la información en el lugar correcto." },
  "Digite o que deseja adicionar": { en: "Type what you want to add", es: "Escribe lo que quieres agregar" },
  "Enviar comando": { en: "Send command", es: "Enviar comando" },
  "Exemplos de comandos": { en: "Command examples", es: "Ejemplos de comandos" },
  "Interpretando comando": { en: "Interpreting command", es: "Interpretando comando" },
  "Desfazer": { en: "Undo", es: "Deshacer" },
  "Registro desfeito.": { en: "Entry undone.", es: "Registro deshecho." },
  "Gastei R$ 200 no mercado hoje": { en: "I spent $200 at the market today", es: "Gasté R$ 200 en el mercado hoy" },
  "Criar nota: ideias para o próximo projeto": { en: "Create note: ideas for the next project", es: "Crear nota: ideas para el próximo proyecto" },
  "Agendar treino amanhã às 18h": { en: "Schedule training tomorrow at 6 pm", es: "Programar entrenamiento mañana a las 18 h" },
  "Para registrar valores, primeiro": { en: "To record transactions, first", es: "Para registrar valores, primero" },
  "cadastre uma conta financeira": { en: "add a financial account", es: "agrega una cuenta financiera" },
  "Demonstração": { en: "Demo", es: "Demostración" },
  "Adicione escrevendo": { en: "Add by typing", es: "Agrega escribiendo" },
  "Descreva uma despesa, nota ou compromisso e o assistente organiza tudo no módulo correto.": { en: "Describe an expense, note or event and the assistant organizes it in the right module.", es: "Describe un gasto, nota o compromiso y el asistente lo organiza en el módulo correcto." },
  "Visitante": { en: "Guest", es: "Visitante" },
  "Constância": { en: "Consistency", es: "Constancia" },
  "Direção": { en: "Direction", es: "Dirección" },
  "Gamificação": { en: "Gamification", es: "Gamificación" },
  "Tempo e compromissos": { en: "Time and commitments", es: "Tiempo y compromisos" },
  "Demonstração pública": { en: "Public demo", es: "Demostración pública" },
  "Organize suas obrigações por etiquetas e veja o calendário por dia, semana, mês ou ano.": { en: "Organize commitments with tags and view the calendar by day, week, month or year.", es: "Organiza tus compromisos con etiquetas y mira el calendario por día, semana, mes o año." },
  "+ Novo compromisso": { en: "+ New event", es: "+ Nuevo compromiso" },
  "Dia": { en: "Day", es: "Día" },
  "Semana": { en: "Week", es: "Semana" },
  "Mês": { en: "Month", es: "Mes" },
  "Ano": { en: "Year", es: "Año" },
  "Crie rotinas, ganhe pontos ao concluir e edite qualquer detalhe quando sua rotina mudar.": { en: "Build routines, earn points when you complete them and edit any detail as your routine changes.", es: "Crea rutinas, gana puntos al completarlas y edita cualquier detalle cuando tu rutina cambie." },
  "Concluídos hoje": { en: "Completed today", es: "Completados hoy" },
  "Taxa do dia": { en: "Daily rate", es: "Tasa del día" },
  "Maior sequência": { en: "Longest streak", es: "Mayor racha" },
  "Carteira": { en: "Wallet", es: "Cartera" },
  "Rotina atual": { en: "Current routine", es: "Rutina actual" },
  "Nenhum hábito registrado ainda.": { en: "No habits added yet.", es: "Aún no hay hábitos registrados." },
  "Transforme objetivos em números, conclua etapas e ganhe pontos pelo resultado.": { en: "Turn goals into measurable progress, complete milestones and earn points for results.", es: "Convierte objetivos en progreso medible, completa etapas y gana puntos por los resultados." },
  "Contas independentes por moeda, com bancos, etiquetas, histórico e edição completa.": { en: "Independent accounts by currency, with banks, tags, history and full editing.", es: "Cuentas independientes por moneda, con bancos, etiquetas, historial y edición completa." },
  "Total acumulado em": { en: "Total balance in", es: "Saldo total en" },
  "Saldo atual somado de": { en: "Current balance across", es: "Saldo actual de" },
  "contas vinculadas": { en: "linked accounts", es: "cuentas vinculadas" },
  "lançamentos": { en: "transactions", es: "movimientos" },
  "Contas em": { en: "Accounts in", es: "Cuentas en" },
  "Não há conversão entre moedas": { en: "Currencies are kept separate", es: "Las monedas se mantienen separadas" },
  "Total das contas": { en: "Accounts total", es: "Total de las cuentas" },
  "Cadastre uma conta em": { en: "Add an account in", es: "Agrega una cuenta en" },
  "para começar.": { en: "to get started.", es: "para comenzar." },
  "Análise por etiqueta": { en: "Analysis by tag", es: "Análisis por etiqueta" },
  "Registre despesas em": { en: "Add expenses in", es: "Registra gastos en" },
  "para visualizar a distribuição.": { en: "to view the breakdown.", es: "para ver la distribución." },
  "Histórico": { en: "History", es: "Historial" },
  "Transforme consistência em pontos e troque seu saldo por recompensas que fazem sentido para você.": { en: "Turn consistency into points and redeem your balance for rewards that matter to you.", es: "Convierte la constancia en puntos y canjea tu saldo por recompensas que tengan sentido para ti." },
  "Saldo disponível": { en: "Available balance", es: "Saldo disponible" },
  "Pontos conquistados": { en: "Points earned", es: "Puntos ganados" },
  "Recompensas compradas": { en: "Rewards redeemed", es: "Recompensas canjeadas" },
  "Sua loja": { en: "Your rewards", es: "Tus recompensas" },
  "disponíveis": { en: "available", es: "disponibles" },
  "Atividade": { en: "Activity", es: "Actividad" },
  "O GitHub Pages executa a interface sem servidor e sem credenciais privadas.": { en: "GitHub Pages runs the interface without a server or private credentials.", es: "GitHub Pages ejecuta la interfaz sin servidor ni credenciales privadas." },
  "Seus dados ficam neste navegador": { en: "Your data stays in this browser", es: "Tus datos permanecen en este navegador" },
  "Você pode testar os módulos e o modo escuro. Login, troca de senha e sincronização com o Supabase ficam disponíveis somente na aplicação completa hospedada em um servidor Next.js.": { en: "You can try the modules and dark mode. Login, password changes and Supabase sync are available in the full app hosted on a Next.js server.", es: "Puedes probar los módulos y el modo oscuro. El inicio de sesión, el cambio de contraseña y la sincronización con Supabase están disponibles en la aplicación completa alojada en un servidor Next.js." },
  "Você pode alterar o conteúdo e reorganizar todas as conexões.": { en: "You can edit the content and reorganize every connection.", es: "Puedes editar el contenido y reorganizar todas las conexiones." },
  "Separe por vírgulas.": { en: "Separate with commas.", es: "Separa con comas." },
  "Substitui a nota fixada atual.": { en: "Replaces the currently pinned note.", es: "Reemplaza la nota fijada actual." },
  "Destaque e estrela no Brain.": { en: "Highlight it and show a star in the Brain.", es: "Destácala y muestra una estrella en el Cerebro." },
  "Nome do hábito": { en: "Habit name", es: "Nombre del hábito" },
  "Frequência": { en: "Frequency", es: "Frecuencia" },
  "Pontos por conclusão": { en: "Points per completion", es: "Puntos por finalización" },
  "Dias úteis": { en: "Weekdays", es: "Días laborables" },
  "Diário": { en: "Daily", es: "Diario" },
  "Saúde": { en: "Health", es: "Salud" },
  "Organização": { en: "Organization", es: "Organización" },
  "Estudo": { en: "Learning", es: "Estudio" },
  "Treino": { en: "Training", es: "Entrenamiento" },
  "Início": { en: "Start", es: "Inicio" },
  "Concluída": { en: "Completed", es: "Completada" },
  "Não iniciada": { en: "Not started", es: "No iniciada" },
  "Editar conta bancária": { en: "Edit bank account", es: "Editar cuenta bancaria" },
  "Editar movimentação": { en: "Edit transaction", es: "Editar movimiento" },
  "Editar hábito": { en: "Edit habit", es: "Editar hábito" },
  "A moeda é definida pela conta e não será misturada com outros saldos.": { en: "The account sets the currency, which remains separate from other balances.", es: "La cuenta define la moneda, que se mantiene separada de otros saldos." },
  "Adicione moedas pelo código ISO. Uma moeda com dados vinculados não pode ser excluída.": { en: "Add currencies by ISO code. A currency with linked data cannot be deleted.", es: "Agrega monedas por código ISO. No se puede eliminar una moneda con datos vinculados." },
  "Cada conta pertence a um país e a uma única moeda.": { en: "Each account belongs to one country and one currency.", es: "Cada cuenta pertenece a un país y a una sola moneda." },
  "Atualizada em": { en: "Updated", es: "Actualizada" },
  "conexão": { en: "connection", es: "conexión" },
};

const orderedPhrases = Object.keys(translations).sort((a, b) => b.length - a.length);
const I18nContext = createContext({ language: "pt" as Language, setLanguage: (language: Language) => { void language; }, locale: "pt-BR", t: (value: string) => value });
const sourceByNode = new WeakMap<Node, string>();
const appliedByNode = new WeakMap<Node, string>();

function translateText(value: string, language: Language) {
  if (language === "pt" || !value.trim()) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length || undefined);
  const exact = translations[core]?.[language];
  if (exact) return `${leading}${exact}${trailing}`;
  let result = core;
  for (const phrase of orderedPhrases) {
    if (result.includes(phrase)) result = result.split(phrase).join(translations[phrase][language]);
  }
  return `${leading}${result}${trailing}`;
}

export function I18nProvider({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt");
  const value = useMemo(() => ({
    language,
    locale: language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR",
    setLanguage(next: Language) {
      setLanguageState(next);
      window.localStorage.setItem(storageKey, next);
    },
    t: (text: string) => translateText(text, language),
  }), [language, storageKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey) as Language | null;
    if (saved === "pt" || saved === "en" || saved === "es") setLanguageState(saved);
  }, [storageKey]);

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : language;
    const attributes = ["placeholder", "aria-label", "title"];

    function translateNode(root: Node) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Node[] = [];
      if (root.nodeType === Node.TEXT_NODE) nodes.push(root);
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const current = node.nodeValue ?? "";
        const previousApplied = appliedByNode.get(node);
        if (!sourceByNode.has(node) || (previousApplied !== undefined && current !== previousApplied)) sourceByNode.set(node, current);
        const translated = translateText(sourceByNode.get(node) ?? current, language);
        appliedByNode.set(node, translated);
        if (current !== translated) node.nodeValue = translated;
      }
      const elements = root.nodeType === Node.ELEMENT_NODE ? [root as Element, ...(root as Element).querySelectorAll("*")] : [];
      for (const element of elements) {
        for (const attribute of attributes) {
          const originalKey = `data-i18n-${attribute}`;
          const current = element.getAttribute(attribute);
          if (!current) continue;
          const original = element.getAttribute(originalKey) ?? current;
          if (!element.hasAttribute(originalKey)) element.setAttribute(originalKey, original);
          const translated = translateText(original, language);
          if (current !== translated) element.setAttribute(attribute, translated);
        }
      }
    }

    translateNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target);
        for (const node of mutation.addedNodes) translateNode(node);
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
