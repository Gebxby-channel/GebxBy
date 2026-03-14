package gebxby.gebxbyblog.model;

import gebxby.gebxbyblog.controller.ContentController;
import gebxby.gebxbyblog.service.ContentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean; // <--- Import baru
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContentController.class)
@AutoConfigureMockMvc(addFilters = false)
class ContentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean // <--- Pake ini sebagai pengganti @MockBean yang deprecated
    private ContentService contentService;

    @Test
    void testGetAllContent() throws Exception {
        when(contentService.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/content/all"))
                .andExpect(status().isOk());
    }
}