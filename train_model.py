import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv("student_mental_health.csv")

df.columns = df.columns.str.strip()
df.replace("?", np.nan, inplace=True)
df.dropna(inplace=True)

if "Depression" in df.columns:
    y = df["Depression"]
    X = df.drop(columns=["Depression"], errors="ignore")
else:
    print("Target column 'Depression' not found.")
    exit()

X = pd.get_dummies(X)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

joblib.dump(model, "model.pkl")
print("✅ Model trained and saved as model.pkl")