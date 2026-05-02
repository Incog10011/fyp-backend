import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("results.csv")

# Group by profile
grouped = df.groupby("profile").mean(numeric_only=True)

# -----------------------------
# 1. RTT Comparison
# -----------------------------
grouped[["edge_rtt_ms", "cloud_rtt_ms"]].plot(kind="bar")
plt.title("Edge vs Cloud Latency (RTT)")
plt.ylabel("Latency (ms)")
plt.xlabel("Workload Size")
plt.xticks(rotation=0)
plt.legend(["Edge", "Cloud"])
plt.tight_layout()
plt.savefig("rtt_comparison.png")
plt.close()

# -----------------------------
# 2. Total Time Comparison
# -----------------------------
grouped[["edge_total_ms", "cloud_total_ms"]].plot(kind="bar")
plt.title("Task Completion Time")
plt.ylabel("Time (ms)")
plt.xlabel("Workload Size")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig("total_time.png")
plt.close()

# -----------------------------
# 3. Cloud Breakdown
# -----------------------------
grouped[["cloud_processing_ms", "cloud_network_ms"]].plot(kind="bar", stacked=True)
plt.title("Cloud Time Breakdown")
plt.ylabel("Time (ms)")
plt.xlabel("Workload Size")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig("cloud_breakdown.png")
plt.close()

# -----------------------------
# 4. Jitter
# -----------------------------
df.groupby("profile")[["edge_rtt_ms", "cloud_rtt_ms"]].std().plot(kind="bar")
plt.title("Jitter Comparison (Standard Deviation)")
plt.ylabel("Jitter (ms)")
plt.xlabel("Workload Size")
plt.xticks(rotation=0)
plt.legend(["Edge", "Cloud"])
plt.tight_layout()
plt.savefig("jitter.png")
plt.close()

# Print jitter values
print("Jitter (std dev):")
print(df.groupby("profile")[["edge_rtt_ms", "cloud_rtt_ms"]].std())
