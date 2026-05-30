# Memory and Token Systems

## Memory

The MVP supports structured memory records, keyword search, and agent/task attachment fields. The schema is ready to expand into vector chunks later.

## Token and Credit Manager

The MVP tracks mock usage events, budgets, warning thresholds, and hard stops. Real provider calls should call the budget evaluator before any LLM request.
