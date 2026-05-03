import streamlit as st
import google.generativeai as genai
import gspread
from google.oauth2.service_account import Credentials
from PIL import Image
import datetime

# 1. API 및 서비스 계정 설정 (Secrets 활용)
def init_services():
    # Gemini 설정
    genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
    
    # Google Sheets 설정
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = Credentials.from_service_account_info(st.secrets["gcp_service_account"], scopes=scope)
    client = gspread.authorize(creds)
    return client

# 2. UI 구성
st.set_page_config(page_title="통합 문서 관리자", layout="wide")
st.title("📑 AI 문서 통합 아카이브")

with st.sidebar:
    st.header("📝 새 문서 등록")
    category = st.selectbox("문서 종류", ["식단표", "당직표", "공지사항", "기타"])
    title = st.text_input("게시글 제목")
    uploaded_file = st.file_uploader("이미지 업로드", type=['png', 'jpg', 'jpeg'])

if uploaded_file and title:
    img = Image.open(uploaded_file)
    st.image(img, caption="미리보기", width=300)
    
    if st.button("🚀 분석 및 저장"):
        try:
            client = init_services()
            # 본인의 구글 시트 이름으로 수정하세요
            sheet = client.open("식단데이터베이스").sheet1 
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"이 {category} 이미지의 내용을 분석해서 마크다운 표나 깔끔한 텍스트로 추출해줘."
            
            with st.spinner("AI 분석 중..."):
                response = model.generate_content([prompt, img])
                content = response.text
                
                now = datetime.datetime.now()
                sheet.append_row([
                    now.strftime("%Y-%m-%d"),
                    category,
                    title,
                    content,
                    now.strftime("%H:%M:%S")
                ])
                st.success("구글 시트에 저장되었습니다!")
                st.markdown(content)
        except Exception as e:
            st.error(f"오류: {e}")
