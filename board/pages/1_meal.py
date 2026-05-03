import streamlit as st
import google.generativeai as genai
from PIL import Image
import datetime
import pandas as pd
from streamlit_gsheets import GSheetsConnection

st.set_page_config(page_title="식단표 AI 관리", layout="wide")
st.title("🍱 식단표 관리 (분석 후 전송)")

# 1. 모델 로드 (가장 안전한 방식)
def load_model():
    try:
        genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
        # 최신 모델 우선, 없으면 하위 모델 자동 선택
        for m_name in ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision']:
            try:
                m = genai.GenerativeModel(m_name)
                # 테스트 호출로 가용성 확인
                return m, m_name
            except:
                continue
        return None, "가용 모델 없음"
    except Exception as e:
        return None, str(e)

model, model_name = load_model()

# 2. UI 구성
uploaded_file = st.file_uploader("식단표 이미지 업로드", type=['png', 'jpg', 'jpeg'])
title = st.text_input("게시글 제목", placeholder="예: 5월 1주차 식단표")

# 세션 상태 초기화 (분석 결과 저장용)
if 'analysis_result' not in st.session_state:
    st.session_state.analysis_result = ""

if uploaded_file:
    img = Image.open(uploaded_file)
    st.image(img, width=400)

    # --- [1단계: AI 분석] ---
    if st.button("🔍 AI 분석 시작"):
        if not title:
            st.warning("제목을 입력해주세요.")
        elif not model:
            st.error(f"모델 로드 실패: {model_name}")
        else:
            with st.spinner("AI가 이미지를 읽고 있습니다..."):
                try:
                    prompt = "이 이미지에서 날짜별 식단 메뉴를 추출해서 마크다운 표 형식으로 정리해줘."
                    response = model.generate_content([prompt, img])
                    st.session_state.analysis_result = response.text
                    st.success("분석 완료! 아래 내용을 확인하고 전송하세요.")
                except Exception as e:
                    st.error(f"분석 중 에러: {e}")

# --- [2단계: 결과 확인 및 전송] ---
if st.session_state.analysis_result:
    st.divider()
    st.subheader("📋 분석 결과 확인/수정")
    
    # AI가 분석한 내용을 편집 가능한 텍스트 영역에 표시
    final_content = st.text_area("내용이 틀렸다면 직접 수정하세요", 
                                 value=st.session_state.analysis_result, 
                                 height=300)
    
    if st.button("🚀 최종 데이터를 구글 시트로 전송"):
        with st.spinner("데이터베이스 저장 중..."):
            try:
                conn = st.connection("gsheets", type=GSheetsConnection)
                existing_df = conn.read(ttl="0")
                
                new_row = pd.DataFrame([{
                    "날짜": datetime.datetime.now().strftime("%Y-%m-%d"),
                    "카테고리": "식단표",
                    "제목": title,
                    "본문내용": final_content,
                    "등록시간": datetime.datetime.now().strftime("%H:%M:%S")
                }])
                
                updated_df = pd.concat([existing_df, new_row], ignore_index=True)
                conn.update(data=updated_df)
                
                st.success("✅ 구글 시트에 저장되었습니다!")
                # 전송 후 결과 초기화 원하면 아래 주석 해제
                # st.session_state.analysis_result = ""
            except Exception as e:
                st.error(f"전송 중 에러: {e}\n(시트 주소와 권한을 확인하세요.)")
