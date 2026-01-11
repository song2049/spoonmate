# SpoonMate 동적 자산 CSV 업로드 가이드

이 문서는 SpoonMate의 **동적 자산(AssetEntity)** 을 CSV로 일괄 등록하는 방법을 설명합니다.

---

## 1. 업로드 대상 구조

SpoonMate 동적 자산은 아래 구조로 저장됩니다.

- AssetType: 자산 유형(예: `software`, `membership`)
- AssetTypeField: 유형별 필드 정의(키, 타입, 필수 여부 등)
- AssetEntity: 실제 자산 데이터
  - title: 자산 제목
  - status: 상태(기본값 `ACTIVE`)
  - data: 동적 필드 값(JSON)
  - source: `CSV` 로 저장됨

---

## 2. 업로드 준비

CSV는 반드시 **헤더(첫 줄)** 가 있어야 합니다.

### 예약 컬럼(필수/권장)
- `title` : 자산 제목 (필수)
  - `title`이 없으면 `name` 컬럼을 대체로 인정합니다.
- `status` : 상태 (선택)
  - 미입력 시 `ACTIVE`

### 동적 필드 컬럼
- `AssetTypeField.key` 값과 **헤더명이 정확히 일치**해야 합니다.
- 예: 필드 키가 `expiryDate` 라면 CSV 헤더도 `expiryDate` 여야 합니다.

---

## 3. 날짜/숫자/불리언 형식

### date
- 권장 형식: `YYYY-MM-DD`
- 예: `2025-01-01`

### number
- 예: `12`, `3.14`

### boolean
- 허용 값 예:
  - true: `true`, `1`, `y`, `yes`, `o`
  - false: `false`, `0`, `n`, `no`, `x`

---

## 4. 예시 CSV

아래는 예시입니다. 실제 사용 시에는 **해당 typeSlug의 AssetTypeField.key**에 맞게 헤더를 구성하세요.

```csv
title,status,expiryDate,seats,autoRenew,notes
Figma Pro,ACTIVE,2025-01-01,30,true,디자인팀 연간 구독
Slack Plus,ACTIVE,2025-03-01,200,false,전사 협업툴
