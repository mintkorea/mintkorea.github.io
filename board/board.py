import streamlit as st
from streamlit_gsheets import GSheetsConnection
import google.generativeai as genai

# 페이지 설정
st.set_page_config(page_title="AI 통합 관리 시스템", layout="wide")

# [공통] 구글 시트 연결 함수 (키 파일 없이 연결)
def get_sheet_conn():
    return st.connection("gsheets", type=GSheetsConnection)

st.title("🏛️ 가톨릭대학교 성의교정 관리 시스템")
st.markdown("""
### 사용 안내
왼쪽 사이드바에서 메뉴를 선택하세요.
1. **식단표 관리**: 식단표 분석 및 저장
2. **당직표 관리**: 근무 명단 분석 및 저장
""")

# 데이터 확인용
if st.button("📊 최근 등록 데이터 확인"):
    try:
        conn = get_sheet_conn()
        # 시트의 전체 데이터를 읽어옵니다.
        df = conn.read(ttl="0") 
        st.table(df.tail(5)) # 마지막 5줄 표시
    except Exception as e:
        st.error("시트 데이터를 불러오려면 Secrets 설정을 먼저 완료해야 합니다.")
