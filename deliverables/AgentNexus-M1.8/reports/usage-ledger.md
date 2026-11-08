# Usage / Cost

四级Token/请求/费用在一个NativeState事务内原子预留；Agent、canonical Task、Project、Platform缺任一级即拒绝。REAL/SIMULATED分账，ESTIMATED不转实际Token/费用；超预留保留原始reported usage、overdrawn及hold。已知meter在后续Archive失败时保留，不重复计费/重发。

单次已SENT requests必须>=1且等retries+1；reasoning_tokens是output细分。价格用整数微美元与每百万Token费率向上取整，拒绝溢出。真实价格、缓存折扣、invoice对账均NOT_RUN，actual-cost.json实际支出0。
