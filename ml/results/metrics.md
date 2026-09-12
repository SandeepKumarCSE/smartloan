# SmartLoan model metrics

Test-set evaluation of `LogisticRegression(class_weight='balanced')`.
Accuracy is omitted on purpose: the LendingClub label is imbalanced.

- Precision (Fully Paid): 0.8500
- Recall (Fully Paid): 0.4638
- AUC-ROC: 0.5929

Confusion matrix (rows = actual, cols = predicted):

```
                Pred Charged Off    Pred Fully Paid
Actual Charged Off           36074             17624
Actual Fully Paid           115442             99850
```

Classification report:

```
              precision    recall  f1-score   support

 Charged Off       0.24      0.67      0.35     53698
  Fully Paid       0.85      0.46      0.60    215292

    accuracy                           0.51    268990
   macro avg       0.54      0.57      0.48    268990
weighted avg       0.73      0.51      0.55    268990
```
