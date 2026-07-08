# ADR 003 — LiteLLM pour le routage multi-modèle

**Date :** 2026-07-09  
**Statut :** Accepté

## Contexte
On veut utiliser plusieurs modèles (Gemini Flash pour les tâches simples, Gemini Pro / Claude pour les
raisonnements complexes) sans verrouiller le code agent à un provider. On veut aussi un point de contrôle
unique pour les quotas, les logs de coût, et le fallback.

## Décision
**LiteLLM** comme proxy/routeur, intégré dans le service ADK.

## Raisons
- Interface unifiée (`litellm.completion(model="gemini/...", ...)`) — swap de provider sans changer le code.
- **Routage** : règles de routage (par tâche, par coût, par latence cible) dans un fichier de config.
- **Budget / quotas** : LiteLLM supporte les budgets par utilisateur/tenant, aligné sur `tenant_ai_quotas`.
- **Logs** : chaque appel LLM est loggé (tokens, coût, latence) → exportable vers Langfuse/Braintrust.
- **Fallback** : si Gemini Pro timeout → fallback Claude Sonnet automatique.
- **Self-host** : LiteLLM proxy se déploie en Docker sur le même VPS (pas de dépendance cloud tierce).

## Config de routage cible
```yaml
# litellm_config.yaml
model_list:
  - model_name: fast          # intent, classification, tri
    litellm_params:
      model: gemini/gemini-2.0-flash
  - model_name: strong        # raisonnement, relances, décisions
    litellm_params:
      model: gemini/gemini-2.5-pro
      fallback: anthropic/claude-opus-4-8
router_settings:
  routing_strategy: cost-based  # ou latency-based selon les evals
```

## Conséquences
- Un conteneur `litellm` supplémentaire dans le docker-compose.
- Les clés API LLM sont dans les variables d'env Coolify (jamais dans le repo).
- Le choix modèle fort (Gemini Pro vs Claude) sera tranché après les premières evals en Phase 0.
