import streamlit as st
import gspread
from google.oauth2.service_account import Credentials
import google.generativeai as genai

# 페이지 설정
st.set_page_config(page_title="AI 통합 관리 시스템", layout="wide")

# [공통 함수] 구글 서비스 연결 (private_key 오류 방지 포함)
def get_gspread_client():
    creds_info = dict(st.secrets["gcp_service_account"])
    # PEM 파일 오류 방지를 위한 줄바꿈 치환
    creds_info["private_key"] = creds_info["private_key"].replace("\\n", "\n")
    
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = Credentials.from_service_account_info(creds_info, scopes=scope)
    return gspread.authorize(creds)

st.title("🏛️ 가톨릭대학교 성의교정 관리 시스템")
st.markdown("""
### 사용 안내
왼쪽 사이드바의 메뉴를 선택하여 업무를 진행해 주세요.
1. **식단표 관리**: 식단표 이미지를 분석하여 데이터베이스에 저장합니다.
2. **당직표 관리**: 보안팀 및 시설팀 당직표를 디지털화합니다.
""")

# 메인 페이지에서도 데이터 확인 가능하게 구성 (선택 사항)
if st.button("📊 최근 등록 데이터 확인"):
    try:
        client = get_gspread_client()
        sheet = client.open("식단데이터베이스").sheet1
        data = sheet.get_all_records()
        st.table(data[-5:]) # 최근 5건만 표시
    except Exception as e:
        st.error(f"데이터를 불러올 수 없습니다: {e}")
